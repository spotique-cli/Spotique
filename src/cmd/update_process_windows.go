//go:build windows

package cmd

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"

	"golang.org/x/sys/windows"

	"github.com/spotique/cli/src/utils"
)

func scheduleUpdateInstall(executable, archive, tagName string, parentPID int) error {
	process := exec.Command(executable, "update-helper", archive, strconv.Itoa(parentPID), tagName)
	process.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000,
	}
	if err := process.Start(); err != nil {
		return fmt.Errorf("start update helper: %w", err)
	}
	go process.Wait()
	return nil
}

func RunUpdateHelper(args []string) error {
	if len(args) != 3 {
		return errors.New("update helper requires archive, parent process ID, and release tag")
	}
	parentPID, err := strconv.ParseUint(args[1], 10, 32)
	if err != nil || parentPID == 0 {
		return fmt.Errorf("invalid update parent process ID %q", args[1])
	}
	parent, err := windows.OpenProcess(windows.SYNCHRONIZE, false, uint32(parentPID))
	if err != nil {
		return fmt.Errorf("open Spotique process %d: %w", parentPID, err)
	}
	defer windows.CloseHandle(parent)

	result, err := windows.WaitForSingleObject(parent, windows.INFINITE)
	if err != nil {
		return fmt.Errorf("wait for Spotique process %d: %w", parentPID, err)
	}
	if result != windows.WAIT_OBJECT_0 {
		return fmt.Errorf("unexpected wait result for Spotique process %d: %d", parentPID, result)
	}

	if err := utils.Unzip(args[0], utils.GetExecutableDir()); err != nil {
		return fmt.Errorf("install downloaded release: %w", err)
	}
	if err := syncDiscordRPCAssets(utils.GetExecutableDir()); err != nil {
		return fmt.Errorf("update Discord Rich Presence files: %w", err)
	}
	if err := os.Remove(args[0]); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove downloaded release archive: %w", err)
	}
	logAutoUpdateSuccess(args[2])
	return nil
}

func syncDiscordRPCAssets(installDirectory string) error {
	configDirectory, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("find user config directory: %w", err)
	}
	dataDirectory := filepath.Join(configDirectory, "spotique")
	appSource := filepath.Join(installDirectory, "CustomApps", "DiscordRPC")
	appDestination := filepath.Join(dataDirectory, "CustomApps", "DiscordRPC")
	if err := utils.Copy(appSource, appDestination, true, nil); err != nil {
		return fmt.Errorf("copy Discord Rich Presence app: %w", err)
	}

	extensionSource := filepath.Join(installDirectory, "Extensions", "discordRPC.js")
	extensionDestination := filepath.Join(dataDirectory, "Extensions")
	if err := utils.CopyFile(extensionSource, extensionDestination); err != nil {
		return fmt.Errorf("copy Discord Rich Presence extension: %w", err)
	}
	return nil
}
