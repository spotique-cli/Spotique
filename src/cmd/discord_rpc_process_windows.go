//go:build windows

package cmd

import (
	"os/exec"
	"syscall"
)

func startDiscordRPCBridgeProcess(executable string) error {
	process := exec.Command(executable, "discord-rpc-bridge")
	process.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000,
	}
	if err := process.Start(); err != nil {
		return err
	}
	go process.Wait()
	return nil
}
