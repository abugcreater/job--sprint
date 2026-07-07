use std::collections::HashSet;

pub(crate) fn permissions_for(
    role: &str,
    user_permissions: &[String],
    extra_permissions: &[String],
) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for permission in role_permissions(role)
        .iter()
        .copied()
        .map(str::to_string)
        .chain(user_permissions.iter().cloned())
        .chain(extra_permissions.iter().cloned())
    {
        if seen.insert(permission.clone()) {
            out.push(permission);
        }
    }
    out
}

pub(crate) fn permissions_are_read_only(permissions: &[String]) -> bool {
    !has_permission(permissions, "runtime:write")
}

pub(crate) fn has_permission(permissions: &[String], permission: &str) -> bool {
    permissions.iter().any(|permission| permission == "*")
        || permissions.iter().any(|candidate| candidate == permission)
}

fn role_permissions(role: &str) -> &'static [&'static str] {
    match role {
        "owner" => &["*"],
        "coach" => &[
            "module:today",
            "module:schedule",
            "module:knowledge",
            "module:interview",
            "module:applications",
            "module:review",
            "module:tools",
            "module:settings",
            "runtime:read",
            "runtime:write",
            "ai:use",
            "data:private",
        ],
        "viewer" => &[
            "module:today",
            "module:schedule",
            "module:knowledge",
            "module:interview",
            "module:applications",
            "module:review",
            "module:settings",
            "runtime:read",
            "layout:view",
            "data:public",
        ],
        _ => &[],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn permissions_for_merges_role_user_and_extra_permissions() {
        let permissions = permissions_for(
            "viewer",
            &["runtime:write".to_string(), "runtime:read".to_string()],
            &["ai:use".to_string()],
        );

        assert!(permissions.contains(&"module:today".to_string()));
        assert!(permissions.contains(&"runtime:write".to_string()));
        assert!(permissions.contains(&"ai:use".to_string()));
        assert_eq!(
            permissions
                .iter()
                .filter(|permission| permission.as_str() == "runtime:read")
                .count(),
            1
        );
    }

    #[test]
    fn read_only_tracks_runtime_write_or_wildcard() {
        assert!(permissions_are_read_only(&["runtime:read".to_string()]));
        assert!(!permissions_are_read_only(&["runtime:write".to_string()]));
        assert!(!permissions_are_read_only(&["*".to_string()]));
    }
}
