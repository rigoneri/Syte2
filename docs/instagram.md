### Setting up Instagram

To get started, create a new application on Instagram for your website by going to <http://instagram.com/developer/>.

Enter the **Application Name**, **Description**, **Website URL** and **Valid Redirect URIs**. For the redirect URL enter `http://localhost:3000/instagram/auth`. Once you are done registering you will be given a **Client ID** and **Client Secret**.

Once you have those four items open the `server > .env` file and enter:

* **Client ID** string under `INSTAGRAM_CLIENT_ID`
* **Client Secret** string under `INSTAGRAM_CLIENT_SECRET`

Also make sure to set:

* `INSTAGRAM_INTEGRATION_DISABLED` to false
* `INSTAGRAM_OAUTH_ENABLED` to true
* `INSTAGRAM_UPDATE_FREQ_MINUTES` to the number of minutes you want to wait before updating the data. `Note` A small number is not always the best and it might make Syte2 slow, use a number close to how often you use Instagram.

Next, restart the server and open the following url <http://localhost:3000/instagram/auth>, you will be taken to Instagram's website and will be asked to sign in and authorize your application. After you authorized you will be taken back to Syte2 and you will be given your **Access Token**. Open the `server > .env` file again and enter:

* **Access Token** under `INSTAGRAM_ACCESS_TOKEN`

Next, restart the server and open the following url <http://localhost:3000/instagram/setup>. If everything is setup right, this will fetch some of your recent posts and save them to the database. If you have posted something recently, you should be able to go to <http://localhost:3000> and see that post in your stream and at this point your Instagram page should be working.

***Note: As of June 1, 2016 personal websites are in Sandbox Mode, which means that only 20 of your recent posts will fetched***

---

Next: [Setting up YouTube](youtube.md)
