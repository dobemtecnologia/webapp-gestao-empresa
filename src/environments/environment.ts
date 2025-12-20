// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: '/proxy', // Usa o proxy em desenvolvimento para evitar CORS
  firebase: {
    apiKey: "AIzaSyCAgR2I1V2VAIPwpmQhm0zdE5fYP-xC18U",
    authDomain: "webapp-gestao-empresa.firebaseapp.com",
    projectId: "webapp-gestao-empresa",
    storageBucket: "webapp-gestao-empresa.firebasestorage.app",
    messagingSenderId: "257477240134",
    appId: "1:257477240134:web:dc1af9240cbc7861863147",
    measurementId: "G-TW8BJSH6QN"
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
