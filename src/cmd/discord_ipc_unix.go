//go:build !windows

package cmd

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
	"time"
)

func dialDiscordIPC() (net.Conn, error) {
	directories := []string{
		os.Getenv("XDG_RUNTIME_DIR"),
		os.Getenv("TMPDIR"),
		os.Getenv("TMP"),
		os.Getenv("TEMP"),
		"/tmp",
	}
	seen := make(map[string]bool)
	var lastError error
	for _, directory := range directories {
		if directory == "" || seen[directory] {
			continue
		}
		seen[directory] = true
		for index := 0; index < 10; index++ {
			path := filepath.Join(directory, fmt.Sprintf("discord-ipc-%d", index))
			connection, err := net.DialTimeout("unix", path, 2*time.Second)
			if err == nil {
				return connection, nil
			}
			lastError = err
		}
	}
	if lastError == nil {
		lastError = fmt.Errorf("Discord IPC socket was not found")
	}
	return nil, lastError
}
