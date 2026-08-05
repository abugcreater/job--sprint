function dataScopeConflicts(users) {
  const usernamesByScope = new Map();
  for (const user of users) {
    const username = text(user, "username");
    if (!username) continue;
    const dataScope = text(user, "dataScope") || username;
    const usernames = usernamesByScope.get(dataScope) || [];
    if (!usernames.includes(username)) usernames.push(username);
    usernamesByScope.set(dataScope, usernames);
  }
  return [...usernamesByScope.entries()]
    .filter(([, usernames]) => usernames.length > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dataScope, usernames]) => ({ dataScope, usernames: usernames.sort() }));
}

function text(source, field) {
  return source && typeof source[field] === "string" ? source[field].trim() : "";
}

module.exports = { dataScopeConflicts };
