import admin from 'firebase-admin'

import { cleanPayload } from './utils/cleanPayload'
import { getDurationBetweenDates } from './utils/formatTime'

export const workSessionCollection = 'sessions'

admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROV_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
})

const db = admin.firestore()

export const saveNewSession = ({
  discordId,
  username,
  discriminator,
  startTime,
  isFinished = false,
  subject
}) =>
  db.collection(workSessionCollection).add(
    cleanPayload({
      discordId,
      username,
      discriminator,
      startTime,
      isFinished,
      subject
    })
  )

export const finishSession = async ({ discordId, discriminator, endTime, isFinished = true }) => {
  const sessionRef = await db
    .collection(workSessionCollection)
    .where('discordId', '==', discordId)
    .where('discriminator', '==', discriminator)
    .where('isFinished', '==', false)
    .limit(1) // This is due to users having only one session at a time
    .get()

  if (!sessionRef.empty && sessionRef.docs.length) {
    const doc = sessionRef.docs[0]
    const { id } = doc
    const { startTime } = doc.data()

    const { miliseconds, formatted } = getDurationBetweenDates(endTime, startTime)

    await db
      .collection(workSessionCollection)
      .doc(id)
      .update(
        cleanPayload({
          endTime,
          isFinished,
          timeSpent: miliseconds
        })
      )

    return formatted
  }

  return null
}

export const getUserSubjects = async ({ discordId }) => {
  const sessionRefs = await db
    .collection(workSessionCollection)
    .where('discordId', '==', discordId)
    .get()

  if (!sessionRefs.empty) {
    // Retrieve all subjects and clean the undefined ones
    const allSubjects = sessionRefs.docs.map((snapshot) => snapshot.data()?.subject).filter(Boolean)

    // Remove duplicates
    return [...new Set(allSubjects)]
  }

  return []
}

export const getLatestSession = async ({ discordId }) => {
  const sessionRefs = await db
    .collection(workSessionCollection)
    .where('discordId', '==', discordId)
    .orderBy('endTime', 'desc')
    .limit(1)
    .get()

  if (!sessionRefs.empty && sessionRefs.docs.length) {
    const session = sessionRefs.docs[0]
    return [session.id, session.data()]
  }

  return null
}

export const removeSessionWithUserId = async ({ sessionId, userId }) => {
  const sessionRef = await db.collection(workSessionCollection).doc(sessionId).get()

  if (sessionRef.exists && sessionRef.data()?.discordId === userId) {
    await sessionRef.ref.delete()
  } else {
    throw new Error()
  }
}

export const removeSession = ({ sessionId }) =>
  db.collection(workSessionCollection).doc(sessionId).delete()

export const updateSessionEndTime = ({ sessionId, endTime, timeSpent }) =>
  db.collection(workSessionCollection).doc(sessionId).update(
    cleanPayload({
      endTime,
      timeSpent
    })
  )
