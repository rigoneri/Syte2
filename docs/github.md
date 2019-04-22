## Setting up Github

To get started sign in to GitHub and go to <https://github.com/settings/applications/new> to register your application.

Enter the **Application Name**, **Homepage URL** and **Authorization callback URL**. For the callback URL enter `http://localhost:3000/github/auth`. Once you are done registering you will be given a **Client ID** and **Client Secret**.

Once you have those four items open the `server > .env` file and enter:

* **Client ID** string under `GITHUB_CLIENT_ID`
* **Client Secret** string under `GITHUB_CLIENT_SECRET`

Also make sure to set:

* `GITHUB_INTEGRATION_DISABLED` to false
* `GITHUB_OAUTH_ENABLED` to true
* `GITHUB_USERNAME` to your twitter username, without the *@*
* `GITHUB_UPDATE_FREQ_MINUTES` to the number of minutes you want to wait before updating the data. `Note` A small number is not always the best and it might make Syte2 slow, use a number close to how often you use github.

Next, restart the server and open the following url <http://localhost:3000/github/auth>, you will be taken to GitHub's website and will be asked to sign in and authorize your application. After you authorized you will be taken back to Syte2 and you will be given your **Access Token**. Open the `server > .env` file again and enter:

* **Access Token Secret** under `GITHUB_ACCESS_TOKEN`

Next, restart the server and open the following url <http://localhost:3000/github/setup>. If everything is setup right, this will fetch some of your recent activity and save them to the database. If you have committed something recently, you should be able to go to <http://localhost:3000> and see that activity in your stream and at this point your Github page should be working.

---

Next: [Setting up Dribbble](dribbble.md)
