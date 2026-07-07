use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;

pub(crate) fn sha256_hex(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub(crate) fn is_hex64(value: &str) -> bool {
    value.len() == 64 && value.chars().all(|character| character.is_ascii_hexdigit())
}

pub(crate) fn constant_time_eq(left: &str, right: &str) -> bool {
    left.len() == right.len() && left.as_bytes().ct_eq(right.as_bytes()).into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sha256_hex_returns_lowercase_digest() {
        assert_eq!(
            sha256_hex("job-sprint"),
            "9f1858393dde6489f877b01ac005a31db4695716cbb27d119e71911b24d1f62c"
        );
    }

    #[test]
    fn is_hex64_requires_exact_hex_digest() {
        assert!(is_hex64(&"a".repeat(64)));
        assert!(is_hex64(&"F".repeat(64)));
        assert!(!is_hex64(&"a".repeat(63)));
        assert!(!is_hex64(&format!("{}z", "a".repeat(63))));
    }

    #[test]
    fn constant_time_eq_requires_equal_len_and_bytes() {
        assert!(constant_time_eq("abc", "abc"));
        assert!(!constant_time_eq("abc", "abd"));
        assert!(!constant_time_eq("abc", "abcd"));
    }
}
