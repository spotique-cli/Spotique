//go:build !windows

package cmd

import "errors"

func scheduleUpdateInstall(_, _, _ string, _ int) error {
	return errors.New("deferred executable updates are only available on Windows")
}

func RunUpdateHelper(_ []string) error {
	return errors.New("the update helper is only available on Windows")
}
