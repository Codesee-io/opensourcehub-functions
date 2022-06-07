import * as functions from "firebase-functions";

import Analytics from "analytics-node";

let _segment: Analytics;
function getSegment() {
  if (!process.env.SEGMENT_WRITE_KEY) {
    throw new Error("Missing SEGMENT_WRITE_KEY environment variable");
  }

  if (!_segment) {
    _segment = new Analytics(process.env.SEGMENT_WRITE_KEY);
  }

  return _segment;
}

// https://firebase.google.com/docs/functions/typescript
// https://firebase.google.com/docs/functions/auth-events
// https://firebase.google.com/docs/functions/firestore-events

// Note: trigger functions require a return value or promise

const GROUP_ID = "opensourcehub" as const;

/**
 * Called when a new user signs up with Firebase auth
 */
export const userCreated = functions.auth.user().onCreate((user) => {
  functions.logger.info("User created", { email: user.email, uid: user.uid });

  getSegment()
    .identify({
      userId: user.uid,
      traits: {
        oshEmail: user.email,
      },
    })
    .group({
      userId: user.uid,
      groupId: GROUP_ID,
    })
    .track({
      userId: user.uid,
      event: "User created",
    });

  return Promise.resolve();
});

/**
 * Called when a user deletes their account
 */
export const userDeleted = functions.auth.user().onDelete((user) => {
  functions.logger.info("User deleted", { email: user.email, uid: user.uid });

  getSegment().track({
    userId: user.uid,
    event: "User deleted",
  });

  return Promise.resolve();
});

const USERS_COLLECTION = "users";

/**
 * Called when a document is created in the "users" collection
 */
export const onUserDocumentCreated = functions.firestore
  .document(USERS_COLLECTION + "/{userId}")
  .onCreate((snapshot, context) => {
    functions.logger.info("User document created", {
      uid: context.params.userId,
    });
    const data = snapshot.data();

    getSegment().identify({
      userId: context.params.userId,
      traits: {
        githubLogin: data.githubLogin,
        oshEmail: data.email,
      },
    });

    return Promise.resolve();
  });
