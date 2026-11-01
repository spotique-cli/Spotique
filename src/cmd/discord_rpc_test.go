package cmd

import (
	"bytes"
	"encoding/binary"
	"net/http/httptest"
	"testing"
)

func TestDiscordRPCFrameRoundTrip(t *testing.T) {
	payload := map[string]string{"cmd": "PING"}
	var frame bytes.Buffer
	if err := writeDiscordFrame(&frame, 1, payload); err != nil {
		t.Fatalf("writeDiscordFrame() error = %v", err)
	}

	opcode, decoded, err := readDiscordFrame(&frame)
	if err != nil {
		t.Fatalf("readDiscordFrame() error = %v", err)
	}
	if opcode != 1 {
		t.Fatalf("opcode = %d, want 1", opcode)
	}
	if string(decoded) != `{"cmd":"PING"}` {
		t.Fatalf("payload = %s, want compact PING request", decoded)
	}
}

func TestReadDiscordFrameRejectsOversizedFrame(t *testing.T) {
	header := make([]byte, 8)
	binary.LittleEndian.PutUint32(header[:4], 1)
	binary.LittleEndian.PutUint32(header[4:], maxDiscordRPCFrame+1)
	if _, _, err := readDiscordFrame(bytes.NewReader(header)); err == nil {
		t.Fatal("readDiscordFrame() accepted an oversized frame")
	}
}

func TestCheckDiscordResponse(t *testing.T) {
	if err := checkDiscordResponse([]byte(`{"evt":"READY"}`)); err != nil {
		t.Fatalf("READY response returned error: %v", err)
	}
	if err := checkDiscordResponse([]byte(`{"evt":"ERROR","data":{"code":4000,"message":"invalid"}}`)); err == nil {
		t.Fatal("ERROR response did not return an error")
	}
}

func TestSpotifyWebSocketOrigin(t *testing.T) {
	for _, origin := range []string{"https://xpui.app.spotify.com", "https://open.spotify.com"} {
		request := httptest.NewRequest("GET", "http://127.0.0.1/activity", nil)
		request.Header.Set("Origin", origin)
		if !spotifyWebSocketOrigin(request) {
			t.Errorf("spotifyWebSocketOrigin(%q) = false", origin)
		}
	}

	request := httptest.NewRequest("GET", "http://127.0.0.1/activity", nil)
	request.Header.Set("Origin", "https://example.com")
	if spotifyWebSocketOrigin(request) {
		t.Fatal("spotifyWebSocketOrigin accepted a non-Spotify website")
	}
}
