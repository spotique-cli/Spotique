package cmd

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"github.com/spotique/cli/src/utils"
)

func Update(currentVersion string) bool {
	return update(currentVersion, false)
}

func UpdateSilently(currentVersion string) bool {
	return update(currentVersion, true)
}

func update(currentVersion string, silent bool) bool {
	if currentVersion == "Dev" {
		return false
	}

	tagName, err := utils.FetchLatestTag()
	if err != nil {
		if silent {
			LogAutoUpdateFailure(err)
		} else {
			utils.PrintError("Cannot fetch latest release info")
			utils.PrintError(err.Error())
		}
		return false
	}
	if currentVersion == tagName {
		if !silent {
			utils.PrintSuccess("Spotique is up-to-date.")
		}
		return false
	}

	if !silent {
		utils.PrintInfo("Latest release: " + tagName)
	}

	assetName := "spotique-" + runtime.GOOS + "-" + runtime.GOARCH
	if runtime.GOOS == "windows" {
		assetName += ".zip"
	} else {
		assetName += ".tar.gz"
	}
	assetURL := "https://github.com/" + utils.GitHubRepository + "/releases/download/v" + tagName + "/" + assetName
	location := filepath.Join(os.TempDir(), "spotique-"+tagName+"-"+assetName)
	removeArchive := true
	defer func() {
		if removeArchive {
			_ = os.Remove(location)
		}
	}()

	var spinnerFail func(string)
	var spinnerSuccess func(string)
	if !silent {
		spinner, _ := utils.Spinner.Start("Downloading Spotique")
		spinnerFail = func(message string) { spinner.Fail(message) }
		spinnerSuccess = func(message string) { spinner.Success(message) }
	}
	fail := func(message string, err error) bool {
		if spinnerFail != nil {
			spinnerFail(message)
		}
		if silent {
			LogAutoUpdateFailure(err)
			return false
		}
		utils.Fatal(err)
		return false
	}

	out, err := os.Create(location)
	if err != nil {
		return fail("Failed to download Spotique", err)
	}

	client := &http.Client{Timeout: 10 * time.Minute}
	resp, err := client.Get(assetURL)
	if err != nil {
		out.Close()
		return fail("Failed to download Spotique", err)
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		out.Close()
		return fail("Failed to download Spotique", fmt.Errorf("unexpected HTTP status: %s for %s", resp.Status, assetURL))
	}

	_, copyErr := io.Copy(out, resp.Body)
	resp.Body.Close()
	closeErr := out.Close()
	if copyErr != nil {
		return fail("Failed to download Spotique", copyErr)
	}
	if closeErr != nil {
		return fail("Failed to download Spotique", closeErr)
	}
	if spinnerSuccess != nil {
		spinnerSuccess("Downloaded Spotique")
	}

	exe, err := os.Executable()
	if err != nil {
		return fail("Failed to locate Spotique executable", err)
	}
	if exe, err = filepath.EvalSymlinks(exe); err != nil {
		return fail("Failed to locate Spotique executable", err)
	}

	if runtime.GOOS == "windows" {
		if err := scheduleUpdateInstall(exe, location, tagName, os.Getpid()); err != nil {
			return fail("Failed to schedule Spotique update", err)
		}
		removeArchive = false
		writeAutoUpdateLog("Update to v" + tagName + " scheduled for after Spotique exits")
		return true
	}

	exeOld := exe + ".old"
	utils.CheckExistAndDelete(exeOld)
	if err = os.Rename(exe, exeOld); err != nil {
		if silent {
			return fail("Failed to replace Spotique executable", err)
		}
		permissionError(err)
	}

	switch runtime.GOOS {
	case "windows":
		err = utils.Unzip(location, utils.GetExecutableDir())
	case "linux", "darwin":
		err = exec.Command("tar", "-xzf", location, "-C", utils.GetExecutableDir()).Run()
	default:
		err = fmt.Errorf("automatic updates are unsupported on %s", runtime.GOOS)
	}
	if err != nil {
		_ = os.Rename(exeOld, exe)
		if silent {
			return fail("Failed to install Spotique update", err)
		}
		permissionError(err)
	}

	utils.CheckExistAndDelete(exeOld)
	if silent {
		logAutoUpdateSuccess(tagName)
	} else {
		utils.PrintSuccess("Successfully updated Spotique to v" + tagName)
	}
	return true
}

func LogAutoUpdateFailure(err error) {
	writeAutoUpdateLog("Update failed: " + err.Error())
}

func logAutoUpdateSuccess(tagName string) {
	writeAutoUpdateLog("Updated successfully to v" + tagName)
}

func writeAutoUpdateLog(message string) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		log.Printf("Spotique automatic updater: %s (cannot find log directory: %v)", message, err)
		return
	}
	logDir := filepath.Join(configDir, "spotique")
	if err := os.MkdirAll(logDir, 0700); err != nil {
		log.Printf("Spotique automatic updater: %s (cannot create log directory: %v)", message, err)
		return
	}
	file, err := os.OpenFile(filepath.Join(logDir, "auto-update.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		log.Printf("Spotique automatic updater: %s (cannot open log file: %v)", message, err)
		return
	}
	defer file.Close()
	if _, err := fmt.Fprintf(file, "%s: %s\n", time.Now().Format(time.RFC3339), message); err != nil {
		log.Printf("Spotique automatic updater: cannot write log file: %v", err)
	}
}

func permissionError(err error) {
	utils.PrintInfo("If fatal error is \"Permission denied\", please check read/write permission of spotique executable directory.")
	utils.PrintInfo("However, if you used a package manager to install spotique, please upgrade by using the same package manager.")
	utils.Fatal(err)
}
