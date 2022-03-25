# Scriptable Scripts

## GitLab Contribution Graph

Shows an overview of your recent GitLab contributions. It is available in small and medium sizes.

### Installation

1. You need to install [Scriptor](https://apps.apple.com/us/app/scriptable/id1405459188) app on your device.
2. Download `GitLabContributionGraph.js` from your device and move it to "Scriptable" directory in iCloud.
3. Open Scriptor app and make sure the script is imported to your scripts.
4. Add a new Scriptable widget. Notice that Large size widget is not supported for this widget.
5. Edit Scriptable widget; Choose `GitLabContributionGraph` as script and select "Run Script" for "When interacting".
6. Press the widget and you will be asked to enter your GitLab URL and Personal Access Token. Enter your credentials and press submit.

### Credentials

Your credentials will be stored in Keychain.

- **GitLab URL**: The GitLab server you want to connect to. For instance: `https://GitLab.example.com`.
- **Personal Access Token**: It is used to authenticate with the GitLab API. For more information, visit [GitLab documentation on creating a personal token](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#creating-a-personal-access-token).

### Acknowledgments

- [GitHub Sponsors Widget](https://gist.github.com/simonbs/4de456dc344748d8048b923baf0edf3f) by @simonbs
