package utils

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	GitHubRepository       = "spotique-cli/Spotique"
	GitHubLatestReleaseURL = "https://api.github.com/repos/" + GitHubRepository + "/releases/latest"
	GitHubReleasesURL      = "https://api.github.com/repos/" + GitHubRepository + "/releases"
)

type GithubRelease struct {
	TagName string `json:"tag_name"`
	Message string `json:"message"`
}

func FetchLatestTag() (string, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	res, err := client.Get(GitHubLatestReleaseURL)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return "", errors.New("GitHub release API returned " + res.Status)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}

	var release GithubRelease
	if err = json.Unmarshal(body, &release); err != nil {
		return "", err
	}

	if release.TagName == "" {
		return "", errors.New("GitHub response: " + release.Message)
	}

	return strings.TrimPrefix(release.TagName, "v"), nil
}
