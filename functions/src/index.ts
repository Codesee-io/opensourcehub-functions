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

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript

// https://firebase.google.com/docs/functions/auth-events

// Note: trigger functions require a return value or promise

const GROUP_ID = "opensourcehub" as const;

export const userCreated = functions.auth.user().onCreate((user) => {
  functions.logger.info("User created", { email: user.email, uid: user.uid });

  getSegment()
    .identify({
      userId: user.uid,
      traits: {
        email: user.email,
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

export const userDeleted = functions.auth.user().onDelete((user) => {
  functions.logger.info("User deleted", { email: user.email, uid: user.uid });

  getSegment().track({
    userId: user.uid,
    event: "User deleted",
  });

  return Promise.resolve();
});
