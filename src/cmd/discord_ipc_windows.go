//go:build windows

package cmd

import (
	"context"
	"fmt"
	"net"
	"time"

	"github.com/Microsoft/go-winio"
)

func dialDiscordIPC() (net.Conn, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	var lastError error
	for index := 0; index < 10; index++ {
		path := fmt.Sprintf(`\\.\pipe\discord-ipc-%d`, index)
		connection, err := winio.DialPipeContext(ctx, path)
		if err == nil {
			return connection, nil
		}
		lastError = err
	}
	return nil, lastError
}
