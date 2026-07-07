use std::path::{Component, Path, PathBuf};

pub(crate) fn normalize_pathname(pathname: &str) -> String {
    if pathname == "/job-sprint" || pathname == "/job-sprint/" {
        "/".to_string()
    } else if let Some(stripped) = pathname.strip_prefix("/job-sprint/") {
        format!("/{stripped}")
    } else {
        pathname.to_string()
    }
}

pub(crate) fn request_base(pathname: &str) -> &'static str {
    if pathname == "/job-sprint" || pathname.starts_with("/job-sprint/") {
        "/job-sprint"
    } else {
        ""
    }
}

pub(crate) fn is_private_static(pathname: &str) -> bool {
    pathname == "/"
        || pathname == "/schedule.html"
        || pathname == "/assets/embedded-data.js"
        || pathname == "/react"
        || pathname == "/react/"
        || pathname == "/react/index.html"
        || pathname.starts_with("/react/assets/")
        || pathname.starts_with("/data/")
}

pub(crate) fn static_path_for(
    root: &Path,
    pathname: &str,
    use_public_safe_data: bool,
) -> Option<PathBuf> {
    if use_public_safe_data && is_public_safe_candidate(pathname) {
        return public_safe_static_path(root, pathname);
    }
    safe_static_path(root, pathname)
}

pub(crate) fn content_type_for(path: &Path) -> String {
    mime_guess::from_path(path)
        .first_or_octet_stream()
        .to_string()
}

pub(crate) fn no_store_path(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|item| item.to_str()),
        Some("html" | "json")
    )
}

fn safe_static_path(root: &Path, pathname: &str) -> Option<PathBuf> {
    let relative = if pathname == "/" {
        "/react/index.html"
    } else {
        pathname
    };
    if relative == "/react/"
        || relative == "/react/index.html"
        || relative.starts_with("/react/assets/")
    {
        let react_root = root.join("apps/react-web/dist");
        let react_relative = if relative == "/react/" {
            "/index.html"
        } else {
            relative.strip_prefix("/react").unwrap_or(relative)
        };
        return safe_join(&react_root, react_relative);
    }
    let allowed = relative == "/schedule.html"
        || relative == "/login.html"
        || relative == "/sw.js"
        || relative == "/assets/manifest.webmanifest"
        || relative.starts_with("/assets/")
        || relative.starts_with("/data/");
    if !allowed {
        return None;
    }
    safe_join(root, relative)
}

fn public_safe_static_path(root: &Path, pathname: &str) -> Option<PathBuf> {
    if !is_public_safe_candidate(pathname) {
        return None;
    }
    safe_join(&root.join("dist/public-safe"), pathname)
}

fn is_public_safe_candidate(pathname: &str) -> bool {
    pathname.starts_with("/data/") || pathname == "/assets/embedded-data.js"
}

fn safe_join(root: &Path, relative: &str) -> Option<PathBuf> {
    let relative_path = Path::new(relative.trim_start_matches('/'));
    let escapes_root = relative_path.components().any(|component| {
        matches!(
            component,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    });
    if escapes_root {
        return None;
    }

    let resolved = root.join(relative_path);
    if resolved.starts_with(root) {
        Some(resolved)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safe_join_rejects_parent_segments() {
        let root = Path::new("/tmp/job-sprint-static-root");

        assert!(safe_join(root, "/assets/app.js").is_some());
        assert!(safe_join(root, "/assets/../data/interview_context.json").is_none());
        assert!(safe_join(root, "/assets/../../private.env").is_none());
    }
}
