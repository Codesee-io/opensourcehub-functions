import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Analytics from "analytics-node";

admin.initializeApp();

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

function prefixEventName(name: string) {
  return `OSH: ${name}`;
}

// https://firebase.google.com/docs/functions/typescript
// https://firebase.google.com/docs/functions/auth-events
// https://firebase.google.com/docs/functions/firestore-events

// Note: trigger functions require a return value or promise

/**
 * Called when a new user signs up with Firebase auth
 */
export const userCreated = functions.auth.user().onCreate((user) => {
  functions.logger.info("User created", { email: user.email, uid: user.uid });

  getSegment()
    .identify({
      userId: user.uid,
      traits: {
        email: user.email,
      },
    })
    .track({
      userId: user.uid,
      event: prefixEventName("User created"),
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
    event: prefixEventName("User deleted"),
  });

  return Promise.resolve();
});

const USERS_COLLECTION = "users";
const PROFILES_COLLECTION = "profiles";

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
        email: data.email,
      },
    });

    return Promise.resolve();
  });

/**
 * Called when a document is updated in the "users" collection
 */
export const onUserDocumentUpdated = functions.firestore
  .document(USERS_COLLECTION + "/{userId}")
  .onUpdate((change, context) => {
    functions.logger.info("User document updated", {
      uid: context.params.userId,
    });
    const after = change.after.data();

    getSegment().identify({
      userId: context.params.userId,
      traits: {
        githubLogin: after.githubLogin,
        email: after.email,
      },
    });

    return Promise.resolve();
  });

/**
 * Called when a document is updated in the "profiles" collection
 */
export const onProfileDocumentUpdated = functions.firestore
  .document(PROFILES_COLLECTION + "/{profileId}")
  .onUpdate(async (change, context) => {
    // We want to send profile information to identify the user
    functions.logger.info("Profile document updated", {
      profileId: context.params.profileId,
    });

    const before = change.before.data();
    const after = change.after.data();

    const isProjectMaintainerChanged =
      before.isProjectMaintainer !== after.isProjectMaintainer;
    const joinNewsletterChanged =
      before.joinNewsletter !== after.joinNewsletter;

    const userId = before.userId;

    // Grab the user's email from the "users" collection
    const userDoc = await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .where("uid", "==", userId)
      .get()
      .then((result) => {
        if (result.docs.length > 0) {
          return result.docs[0].data();
        }
        return null;
      })
      .catch(() => null);

    if (userDoc && (isProjectMaintainerChanged || joinNewsletterChanged)) {
      functions.logger.info("Identifying from profile update", {
        userId,
        githubLogin: userDoc.githubLogin,
        email: userDoc.email,
        is_project_maintainer: after.isProjectMaintainer,
        send_me_osh_news: after.joinNewsletter ?? false,
      });
      getSegment().identify({
        userId: userId,
        traits: {
          githubLogin: userDoc.githubLogin,
          email: userDoc.email,
          is_project_maintainer: after.isProjectMaintainer,
          send_me_osh_news: after.joinNewsletter ?? false,
        },
      });
    } else {
      functions.logger.error("Unable to find user for profile", {
        profileId: context.params.profileId,
        userId,
      });
    }

    return Promise.resolve();
  });
