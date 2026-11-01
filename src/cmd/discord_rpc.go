package cmd

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const (
	discordApplicationID = "1566465700657373466"
	discordBridgeAddress = "127.0.0.1:17342"
	maxDiscordRPCFrame   = 1 << 20
)

type discordTrackUpdate struct {
	Title      string `json:"title"`
	Artist     string `json:"artist"`
	Album      string `json:"album"`
	Artwork    string `json:"artwork"`
	PositionMs int64  `json:"positionMs"`
	DurationMs int64  `json:"durationMs"`
	Playing    bool   `json:"playing"`
}

func RunDiscordRPCBridge() error {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("find user config directory: %w", err)
	}
	logDir := filepath.Join(configDir, "spotique")
	if err := os.MkdirAll(logDir, 0700); err != nil {
		return fmt.Errorf("create Discord bridge log directory: %w", err)
	}
	logFile, err := os.OpenFile(filepath.Join(logDir, "discord-rpc.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("open Discord bridge log: %w", err)
	}
	defer logFile.Close()
	log.SetOutput(logFile)

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	upgrader := websocket.Upgrader{
		ReadBufferSize:  4096,
		WriteBufferSize: 4096,
		CheckOrigin:     spotifyWebSocketOrigin,
	}
	mux.HandleFunc("/activity", func(w http.ResponseWriter, r *http.Request) {
		connection, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer connection.Close()
		connection.SetReadLimit(16 * 1024)
		for {
			messageType, payload, err := connection.ReadMessage()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
					log.Printf("read local activity update: %v", err)
				}
				return
			}
			if messageType != websocket.TextMessage {
				continue
			}

			var update discordTrackUpdate
			if err := json.Unmarshal(payload, &update); err != nil {
				writeWebSocketResult(connection, err)
				continue
			}
			if err := updateDiscordActivity(update); err != nil {
				log.Printf("update Discord activity: %v", err)
				writeWebSocketResult(connection, err)
				continue
			}
			writeWebSocketResult(connection, nil)
		}
	})

	listener, err := net.Listen("tcp", discordBridgeAddress)
	if err != nil {
		return fmt.Errorf("listen for Spotify activity on %s: %w", discordBridgeAddress, err)
	}
	defer listener.Close()
	log.Printf("Discord Rich Presence bridge listening on %s", discordBridgeAddress)
	server := &http.Server{Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	return server.Serve(listener)
}

func spotifyWebSocketOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}
	host := strings.ToLower(parsed.Hostname())
	return host == "spotify.com" || strings.HasSuffix(host, ".spotify.com")
}

func writeWebSocketResult(connection *websocket.Conn, err error) {
	result := struct {
		OK    bool   `json:"ok"`
		Error string `json:"error,omitempty"`
	}{OK: err == nil}
	if err != nil {
		result.Error = err.Error()
	}
	if writeErr := connection.WriteJSON(result); writeErr != nil {
		log.Printf("write local activity response: %v", writeErr)
	}
}

func updateDiscordActivity(update discordTrackUpdate) error {
	update.Title = strings.TrimSpace(update.Title)
	update.Artist = strings.TrimSpace(update.Artist)
	update.Album = strings.TrimSpace(update.Album)
	if len(update.Title) > 256 || len(update.Artist) > 256 || len(update.Album) > 256 {
		return errors.New("track metadata exceeds the accepted length")
	}

	connection, err := dialDiscordIPC()
	if err != nil {
		return fmt.Errorf("connect to Discord desktop (is it running?): %w", err)
	}
	defer connection.Close()
	if err := connection.SetDeadline(time.Now().Add(5 * time.Second)); err != nil {
		return fmt.Errorf("set Discord IPC deadline: %w", err)
	}
	if err := writeDiscordFrame(connection, 0, map[string]any{"v": 1, "client_id": discordApplicationID}); err != nil {
		return fmt.Errorf("send Discord IPC handshake: %w", err)
	}
	if _, payload, err := readDiscordFrame(connection); err != nil {
		return fmt.Errorf("read Discord IPC handshake: %w", err)
	} else if err := checkDiscordResponse(payload); err != nil {
		return err
	}

	var activity any
	if update.Title != "" {
		fields := map[string]any{
			"details":  update.Title + " with Spotique",
			"state":    update.Artist,
			"type":     2,
			"instance": false,
		}
		if update.Artist == "" {
			delete(fields, "state")
		}
		if update.Artwork != "" && strings.HasPrefix(update.Artwork, "https://i.scdn.co/") {
			fields["assets"] = map[string]string{
				"large_image": update.Artwork,
				"large_text":  update.Album,
			}
		}
		if update.Playing && update.DurationMs > 0 {
			now := time.Now().Unix()
			start := now - update.PositionMs/1000
			fields["timestamps"] = map[string]int64{
				"start": start,
				"end":   start + update.DurationMs/1000,
			}
		}
		activity = fields
	}

	request := map[string]any{
		"cmd":   "SET_ACTIVITY",
		"args":  map[string]any{"pid": os.Getpid(), "activity": activity},
		"nonce": fmt.Sprintf("%d", time.Now().UnixNano()),
	}
	if err := writeDiscordFrame(connection, 1, request); err != nil {
		return fmt.Errorf("send Discord activity: %w", err)
	}
	_, payload, err := readDiscordFrame(connection)
	if err != nil {
		return fmt.Errorf("read Discord activity response: %w", err)
	}
	return checkDiscordResponse(payload)
}

func writeDiscordFrame(writer io.Writer, opcode uint32, payload any) error {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if len(encoded) > maxDiscordRPCFrame {
		return errors.New("Discord RPC request exceeds maximum frame size")
	}
	header := make([]byte, 8)
	binary.LittleEndian.PutUint32(header[:4], opcode)
	binary.LittleEndian.PutUint32(header[4:], uint32(len(encoded)))
	if err := writeAll(writer, header); err != nil {
		return err
	}
	return writeAll(writer, encoded)
}

func writeAll(writer io.Writer, data []byte) error {
	for len(data) > 0 {
		written, err := writer.Write(data)
		if err != nil {
			return err
		}
		if written == 0 {
			return io.ErrShortWrite
		}
		data = data[written:]
	}
	return nil
}

func readDiscordFrame(reader io.Reader) (uint32, []byte, error) {
	header := make([]byte, 8)
	if _, err := io.ReadFull(reader, header); err != nil {
		return 0, nil, err
	}
	opcode := binary.LittleEndian.Uint32(header[:4])
	length := binary.LittleEndian.Uint32(header[4:])
	if length > maxDiscordRPCFrame {
		return 0, nil, fmt.Errorf("Discord RPC frame is too large: %d bytes", length)
	}
	payload := make([]byte, length)
	if _, err := io.ReadFull(reader, payload); err != nil {
		return 0, nil, err
	}
	return opcode, payload, nil
}

func checkDiscordResponse(payload []byte) error {
	var response struct {
		Event string `json:"evt"`
		Data  struct {
			Message string `json:"message"`
			Code    int    `json:"code"`
		} `json:"data"`
	}
	if err := json.Unmarshal(payload, &response); err != nil {
		return fmt.Errorf("decode Discord RPC response: %w", err)
	}
	if response.Event == "ERROR" {
		return fmt.Errorf("Discord RPC error %d: %s", response.Data.Code, response.Data.Message)
	}
	return nil
}

func discordBridgeHealthy() bool {
	ctx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://"+discordBridgeAddress+"/health", nil)
	if err != nil {
		return false
	}
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return false
	}
	response.Body.Close()
	return response.StatusCode == http.StatusNoContent
}
