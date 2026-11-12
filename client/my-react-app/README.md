# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Deploy to Vercel, Render, and TiDB Cloud

Deploy the React frontend to Vercel, the Express API as a Render Web Service, and use a TiDB Cloud Starter database. TiDB Starter speaks the MySQL protocol and requires TLS. Its free usage quota has limits.

Vercel frontend environment variable:

```env
REACT_APP_API_URL=https://your-render-api.onrender.com
```

Render backend environment variables:

```env
NODE_ENV=production
CLIENT_ORIGIN=https://yourspace-mu.vercel.app
SESSION_SECRET=replace-with-a-long-random-secret
DB_HOST=your-tidb-host
DB_PORT=4000
DB_USER=your-tidb-user
DB_PASSWORD=your-new-tidb-password
DB_NAME=test
DB_SSL_CA=paste-the-TiDB-CA-certificate-here
```

Set `DB_SSL_CA` to the CA certificate provided by TiDB. The backend accepts a PEM value with real line breaks or escaped `\n` sequences. Keep passwords and session secrets private. Configure TiDB network access to allow the Render service's outbound IP ranges.

Production session cookies use `SameSite=None; Secure` for cross-site requests. Some browsers block third-party cookies, so a custom frontend/API domain under the same site may be needed for reliable sessions. Render's local filesystem is not persistent. To store uploads on a Render persistent disk, attach a disk to the API service, mount it at `/var/data`, and set `MEDIA_STORAGE_PATH=/var/data/uploads` in the service's environment. Use a Render plan that supports persistent disks. If you run multiple API instances, use shared object storage instead, since a disk is attached to one instance.

## Run the social app locally

The app uses a React client, an Express/Sequelize API, and MySQL. Start MySQL and create the database before starting the API:

```sql
CREATE DATABASE mydb;
```

In PowerShell, start the API in one terminal. The defaults are `127.0.0.1`, MySQL user `root`, an empty password, and database `mydb`; set these variables first if your local MySQL setup differs:

```powershell
cd ..\..\server
$env:DB_HOST = "127.0.0.1"
$env:DB_USER = "root"
$env:DB_PASSWORD = ""
$env:DB_NAME = "mydb"
npm start
```

Sequelize creates the app tables when the API starts and adds the post-owner column to an existing `Posts` table without removing its data. The API listens on port `3001` by default. In a second terminal, start the React client:

```powershell
cd client\my-react-app
npm start
```

Open [http://localhost:3000](http://localhost:3000). For production, configure a strong `SESSION_SECRET` and appropriate database credentials in the server environment.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
