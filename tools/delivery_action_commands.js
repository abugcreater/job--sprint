const os = require("os");
const path = require("path");

const defaultDeliveryEnvFile = path.join(os.homedir(), ".job-sprint", "job-sprint-delivery.env");

const deliveryCommands = {
  serverSync: `npm run write:server-sync-evidence -- --delivery-env-file ${defaultDeliveryEnvFile} --report docs/evidence/server-sync/sync.json`,
  remoteRestart: `npm run restart:remote-service -- --delivery-env-file ${defaultDeliveryEnvFile} --report docs/evidence/server-remote/service-restart.json`,
  serverRemote: `npm run write:remote-evidence -- --delivery-env-file ${defaultDeliveryEnvFile} --report docs/evidence/server-remote/acceptance.json`,
  remoteInvitations: `npm run write:remote-invitation-evidence -- --delivery-env-file ${defaultDeliveryEnvFile} --report docs/evidence/server-remote/coach-invitations.json`,
  remoteInvitationAccount: `npm run write:remote-invitation-account-evidence -- --delivery-env-file ${defaultDeliveryEnvFile} --report docs/evidence/server-remote/coach-invitation-account.json --allow-create-account`,
  remoteLoginSwitch: `npm run write:remote-login-switch-evidence -- --delivery-env-file ${defaultDeliveryEnvFile} --report docs/evidence/server-remote/login-switch.json --allow-create-account`,
  androidRemote: `npm run test:android:remote:functional -- --delivery-env-file ${defaultDeliveryEnvFile}`,
  androidSigningInit: `npm run init:android-release-signing -- --delivery-env-file ${defaultDeliveryEnvFile} --write-env`,
  formalRelease: `npm run build:android:release -- --delivery-env-file ${defaultDeliveryEnvFile} --report docs/evidence/android-release/formal-release.json`,
  finalDelivery: `npm run final:delivery -- --delivery-env-file ${defaultDeliveryEnvFile} --report docs/evidence/final-delivery/final-delivery.json`
};

module.exports = {
  defaultDeliveryEnvFile,
  deliveryCommands
};
