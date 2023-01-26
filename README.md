# OSH Functions

Cloud functions for [Open-Source Hub](https://github.com/Codesee-io/opensourcehub).

We use these to identify and track users in Open Source Hub by hooking onto Firestore lifecycle events.

## Contributing

### Requirements

You'll need the `firebase-tools@11.21` package installed globally:

```
npm i -g firebase-tools
```

### First-time setup

Note that the structure of this repo differs from regular Node/JavaScript repos: there's no `package.json` file at the root.

1. Clone the repo
2. Navigate into the `functions` directory and run `yarn install`
3. Create a `.env` file inside the `functions` directory
4. Add the required environment variables:

   ```
   SEGMENT_WRITE_KEY="... find this in Segment"
   ```

5. Run the emulator: `yarn serve`

TODO this is incomplete! How do we test the functions?

## Deployment

Run the command below at the root of the repo:

```
firebase deploy --only functions
```
