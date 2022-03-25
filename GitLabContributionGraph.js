// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: code-branch;

/**
 * Author:    Shahab Saeeda
 * Created:   25.03.2022
 *
 * Version: 1.0
 **/

/**
 * Credentials:
 * - GitLab URL: The GitLab server you want to connect to. For instance: "https://gitlab.example.com".
 * - Personal Access Token: It is used to authenticate with the GitLab API.
 *    For more information, visit https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#creating-a-personal-access-token.
 */

/**
 * Keychain key for GitLab personal access token.
 */
const GITLAB_ACCESS_TOKEN_KEY = "gitlab.widget.contribution.graph.accessToken";

/**
 * Keychain key for GitLab URL.
 */
const GITLAB_URL_KEY = "gitlab.widget.contribution.graph.url";

/**
 * A dictionary containing error messages.
 */
const errors = {
  largeFamily:
    "GitLab Contribution Graph widget only supports small and medium families. Please select one of those variations.",
  missingCredentials:
    "Credentials are not provided. Press to enter credentials.",
  unauthorized: "Personal access token is invalid.",
};

/**
 * Color palette used by the widget
 */
const palette = {
  background: Color.dynamic(Color.white(), Color.black()),
  gray: Color.dynamic(new Color("#eaedf6", 0.85), new Color("#525062", 0.4)),
  primary: {
    light: new Color("#acd5f2"),
    main: new Color("#7fa8c9"),
    dark: new Color("#527ba0"),
    darker: new Color("#254e77"),
  },
  text: {
    primary: Color.dynamic(new Color("#000000"), new Color("#ffffff")),
  },
};

/**
 * An instance of DateFormatter, which converts between dates and their textual representations.
 * Make sure it is initialized once.
 */
const formatter = (function initFormatter() {
  const formatter = new DateFormatter();

  formatter.dateFormat = "yyyy-MM-dd";

  return formatter;
})();

/**
 * Whether or not the widget is configured.
 */
const credentialsAlreadyExists =
  Keychain.contains(GITLAB_ACCESS_TOKEN_KEY) &&
  Keychain.contains(GITLAB_URL_KEY);

/**
 * Runs the script.
 */
try {
  if (config.runsInWidget) {
    if (credentialsAlreadyExists) {
      const family = config.widgetFamily;
      const widget = await createWidget(family);

      Script.setWidget(widget);
      Script.complete();
    } else {
      throw new Error(errors.missingCredentials);
    }
  } else if (credentialsAlreadyExists) {
    await showMainMenu();

    Script.complete();
  } else {
    await showCredentialsDialog();

    Script.complete();
  }
} catch (error) {
  const errorMessage = error.message || error;
  const widget = await createErrorWidget(errorMessage);

  Script.setWidget(widget);
  Script.complete();
}

/**
 * Add the specified number of days to the given date.
 *
 * @param {Date} date - The date to be changed
 * @param {number} amount - the amount of days to be added.
 * @returns {Date}
 */
function addDays(date, amount) {
  // Clone the date
  const _date = new Date(date);

  _date.setDate(date.getDate() + amount);

  return _date;
}

/**
 * Subtract the specified number of days from the given date.
 *
 * @param {Date} date - The date to be changed
 * @param {number} amount - The amount of days to be subtracted.
 * @returns {Date}
 */
function subDays(date, amount) {
  return addDays(date, -amount);
}

/**
 * Get the day of the week of the given date.
 *
 * @param {Date} date - The given date.
 * @returns {0|1|2|3|4|5|6} The day of week, 0 represents Sunday.
 */
function getDay(date) {
  return date.getDay();
}

/**
 * Returns whether or not the first date is after the second one.
 *
 * @param {Date} date - The date that should be after the other one to return true.
 * @param {Date} dateToCompare - The date to compare with.
 * @returns {boolean}
 */
function isAfter(date, dateToCompare) {
  return date.getTime() > dateToCompare.getTime();
}

/**
 * Returns a color based on the number of contributions of user activity.
 *
 * @param {number} contributions - Number of contributions.
 * @returns {Color}
 */
function getContributionColor(contributions) {
  if (contributions === 0) {
    return palette.gray;
  } else if (contributions >= 30) {
    return palette.primary.darker;
  } else if (contributions >= 20) {
    return palette.primary.dark;
  } else if (contributions >= 10) {
    return palette.primary.main;
  }

  return palette.primary.light;
}

/**
 * Creates an object containing all dates between ghe given dates as its keys.
 *
 * @param {Date} startDate - Start of the date range.
 * @param {Date} endDate - End of the date range.
 * @returns {object}
 */
function getDates(startDate, endDate) {
  const dates = {};
  let currentDate = new Date(startDate);

  while (!isAfter(currentDate, endDate)) {
    dates[formatter.string(currentDate)] = 0;
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

/**
 * Updates number of contributions on the calendar object based on events.
 *
 * @param {object} calendar - Calendar object.
 * @param {Array<object>} events - Array of events.
 */
function updateCalendarWithEvents(calendar, events) {
  const length = events.length;

  for (let i = 0; i < length; i++) {
    const key = formatter.string(new Date(events[i]));

    calendar[key] += 1;
  }
}

/**
 * Returns a Request object made to be sent to events endpoint.
 *
 * @param {object} params - Parameters of request.
 * @param {string} params.after - Formatted date used to filter request to show only events created after it.
 * @param {number} params.page - Page nubmer.
 * @returns {Request}
 */
function makeEventsRequest({ after, page }) {
  const accessToken = Keychain.get(GITLAB_ACCESS_TOKEN_KEY);
  const gitlabUrl = Keychain.get(GITLAB_URL_KEY);
  // In GitLab API, maximum number of items per page is 100.
  const request = new Request(
    `${gitlabUrl}/api/v4/events?after=${after}&sort=asc&per_page=100&page=${page}`
  );

  request.headers = { Authorization: `Bearer ${accessToken}` };

  return request;
}

/**
 * Fetches a page of currently authenticated user's events after a particular date.
 *
 * @param {object} params - Parameters of request.
 * @param {string} params.after - Formatted date used to filter request to show only events created after it.
 * @param {number} params.page - Page nubmer.
 * @returns {Promise}
 */
async function fetchEvents({ after, page }) {
  const request = makeEventsRequest({ after, page });

  return new Promise((resolve, reject) =>
    request
      .loadJSON()
      .then((response) => {
        if (!Array.isArray(response)) {
          if (response.message === "401 Unauthorized") {
            throw new Error(errors.unauthorized);
          }
          throw new Error(response.message);
        }
        const events = response.map((event) => event.created_at);

        resolve({ events, request });
      })
      .catch(reject)
  );
}

/**
 * Fetches list of all of currently authenticated user’s events after a particular date.
 *
 * @param {string} after - Formatted date used to filter request to show only events created after it.
 * @returns {Array}
 */
async function getUserContributionEvents(after) {
  // Get the first page to see how many pages there are as the query response.
  const firstPagePromise = fetchEvents({ after, page: 1 });

  const { request } = await firstPagePromise;
  const totalPages = request.response.headers["x-total-pages"];
  const promises = [];

  promises.push(firstPagePromise);

  // Now push promises of other of pages into an array and wait for all of them to be fulfilled.
  for (let page = 2; page <= totalPages; page++) {
    promises.push(fetchEvents({ after, page }));
  }

  return await Promise.all(promises);
}

/**
 * Renders an overview graph of recent GitLab contributions.
 *
 * @param {object} widget - Widget.
 * @param {object} calendar - Object containing contributions of user.
 * @param {number} weeks - Number of weeks(columns) based on the widget family.
 * @param {number} dayOfWeek - Day of the week. 0 represents Sunday.
 */
function renderContributionGraph(widget, calendar, weeks, dayOfWeek) {
  const stack = widget.addStack();

  stack.spacing = 4;
  stack.cornerRadius = 6;

  const entries = Object.entries(calendar);

  for (let column = 0; column < weeks; column++) {
    const weekStack = stack.addStack();

    weekStack.layoutVertically();
    weekStack.spacing = 4;

    for (let row = 0; row < 7; row++) {
      const index = column * 7 + row;
      const contribution = entries[index][1];
      const dayStack = weekStack.addStack();

      dayStack.cornerRadius = 2;
      dayStack.setPadding(7.1, 7.1, 7.1, 7.1);
      dayStack.backgroundColor = getContributionColor(contribution);

      // If we are not in the last day of week righ now, break.
      if (column === weeks - 1 && row === dayOfWeek) {
        break;
      }
    }
  }
}

/**
 * Creates GitLab Contribution Graph widget.
 *
 * @param {string} family - Widget family.
 * @returns {object}
 */
async function createWidget(family) {
  if (family === "large") {
    throw new Error(errors.largeFamily);
  }

  const widget = new ListWidget();

  widget.backgroundColor = palette.background;
  widget.setPadding(21, 21, 21, 21);

  // Number of weeks(columns) based on the family (size).
  const weeks = family === "small" ? 7 : 17;
  // New Date object containing the current date and time.
  const now = new Date();
  // Day of the week. 0 represents Sunday.
  const dayOfWeek = getDay(now);
  // Number of days that are to be displayed in the widgget.
  const daysCount = weeks * 7 - (7 - dayOfWeek);
  // First date.
  // Set the hour to make sure that daylight saving does not cause any problem.
  const startDate = subDays(new Date(now.setHours(12)), daysCount);
  // First date formatted to be used in GitLab API.
  const after = formatter.string(startDate);
  // Object containing contributions of the user. Keys are dates and values are the number of contributions.
  const calendar = getDates(startDate, now);
  // Make requests to GitLab events endpoint to get user's activities.
  const eventsPages = await getUserContributionEvents(after);

  // Update the calendar object.
  for (const { events } of await eventsPages) {
    updateCalendarWithEvents(calendar, events);
  }

  renderContributionGraph(widget, calendar, weeks, dayOfWeek);

  return widget;
}

/**
 * Creates a widget for displaying errors.
 *
 * @param {string} message - Error message.
 * @returns {object}
 */
async function createErrorWidget(message) {
  const widget = new ListWidget();

  widget.backgroundColor = palette.background;
  widget.setPadding(21, 21, 21, 21);

  const titleText = widget.addText("GitLab Contribution Graph");

  titleText.font = Font.boldSystemFont(14);
  titleText.textColor = palette.text.primary;
  titleText.minimumScaleFactor = 0.6;

  widget.addSpacer(4);

  const descriptionText = widget.addText(`Error: ${message}`);

  descriptionText.font = Font.systemFont(14);
  descriptionText.textColor = palette.text.primary;
  descriptionText.minimumScaleFactor = 0.6;

  return widget;
}

/**
 * Reads a value from Keychain.
 *
 * @param {string} key - Key of credential stored in Keychain.
 * @returns {void}
 */
function safeKeychainGet(key) {
  if (Keychain.contains(key)) {
    return Keychain.get(key);
  }
}

/**
 * Removes an item from Keychain.
 *
 * @param {string} key - Key of credential stored in Keychain.
 * @returns {void}
 */
function safeKeychainRemove(key) {
  if (Keychain.contains(key)) {
    Keychain.remove(key);
  }
}

/**
 * Displays a dialog and asks user to enter credentials.
 */
async function showCredentialsDialog() {
  const alert = new Alert();

  let gitlabUrl = safeKeychainGet(GITLAB_URL_KEY);
  let accessToken = safeKeychainGet(GITLAB_ACCESS_TOKEN_KEY);

  alert.title = "GitLab Credentials";
  alert.message =
    "Please enter fields below to use GitLab Contribution Graph widget. Your credentials will be stored in Keychain.";
  alert.addTextField("GitLab URL", gitlabUrl);
  alert.addSecureTextField("Personal Access Token", accessToken);
  alert.addAction("Submit");
  alert.addAction("Help");
  alert.addCancelAction("Cancel");

  const index = await alert.present();

  if (index === 0) {
    gitlabUrl = alert.textFieldValue(0);
    accessToken = alert.textFieldValue(1);
  } else if (index === 1) {
    WebView.loadHTML(`
      <h1>GitLab Contribution Graph</h1>
      <h2>Credentials</h2>
      <ul>
        <li>
          GitLab URL: The GitLab server you want to connect to. For instance: "https://gitlab.example.com".
        </li>
        <li>
          Personal Access Token: It is used to authenticate with the GitLab API.
          For more information, please visit 
          <a href="https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#creating-a-personal-access-token">this link</a>.
        </li>
      </ul>
    `);

    return;
  } else {
    throw new Error(errors.missingCredentials);
  }

  const isUrlValid = !!gitlabUrl;
  const isAccessTokenValid = !!accessToken;
  const isValid = isUrlValid && isAccessTokenValid;

  if (isUrlValid) {
    Keychain.set(GITLAB_URL_KEY, gitlabUrl);
  }

  if (isAccessTokenValid) {
    Keychain.set(GITLAB_ACCESS_TOKEN_KEY, accessToken);
  }

  if (isValid) {
    await showMainMenu();
  } else {
    await showCredentialsDialog();
  }
}

/**
 * Displays the main menu for widget.
 */
async function showMainMenu() {
  const alert = new Alert();

  alert.addAction("Visit GitLab");
  alert.addAction("Preview Small Widget");
  alert.addAction("Preview Medium Widget");
  alert.addDestructiveAction("Remove Credentials");
  alert.addAction("About");
  alert.addCancelAction("Cancel");

  const index = await alert.presentAlert();

  if (index === 0) {
    const url = safeKeychainGet(GITLAB_URL_KEY);

    Safari.open(url);
  } else if (index === 1) {
    const widget = await createWidget("small");

    await widget.presentSmall();
  } else if (index === 2) {
    const widget = await createWidget("medium");

    await widget.presentMedium();
  } else if (index === 3) {
    await showCredentialsRemovalAlret();
  } else if (index === 4) {
    // TODO: Add about page.
  }
}

/**
 * Displays confirmation dialog for removing credentials from Keychain.
 */
async function showCredentialsRemovalAlret() {
  const alert = new Alert();

  alert.title = "Remove Credentials";
  alert.message = "Are you sure you want to remove credentials from Keychain?";
  alert.addDestructiveAction("Remove");
  alert.addCancelAction("Cancel");

  const index = await alert.presentAlert();

  if (index === 0) {
    removeCredentials();
  }
}

/**
 * Removes stored credentials from Keychain.
 */
function removeCredentials() {
  safeKeychainRemove(GITLAB_URL_KEY);
  safeKeychainRemove(GITLAB_ACCESS_TOKEN_KEY);
}
