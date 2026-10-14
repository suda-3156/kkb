import tempfile
import unittest
from pathlib import Path

from check_tool_versions import Check, check_version, compare_versions, run


class CompareVersionsTest(unittest.TestCase):
    def test_orders_numerically_not_lexically(self):
        self.assertEqual(compare_versions("1.9", "1.27"), -1)

    def test_missing_components_count_as_zero(self):
        self.assertEqual(compare_versions("1.27", "1.27.0"), 0)
        self.assertEqual(compare_versions("1.27", "1.27.2"), -1)

    def test_rejects_non_numeric_versions(self):
        with self.assertRaises(ValueError):
            compare_versions("1.28rc1", "1.27.2")


class CheckVersionTest(unittest.TestCase):
    def test_modes(self):
        cases = [
            ("1.27.2", "1.27.2", {"eq": True, "le": True, "lt": False, "ge": True, "gt": False}),
            ("1.27.1", "1.27.2", {"eq": False, "le": True, "lt": True, "ge": False, "gt": False}),
            ("1.28.0", "1.27.2", {"eq": False, "le": False, "lt": False, "ge": True, "gt": True}),
        ]
        for actual, expected, results in cases:
            for mode, want in results.items():
                with self.subTest(actual=actual, expected=expected, mode=mode):
                    self.assertIs(check_version(actual, expected, mode), want)

    def test_eq_needs_the_same_precision_unless_the_rest_is_zero(self):
        self.assertFalse(check_version("1.27", "1.27.2", "eq"))

    def test_rejects_unknown_mode(self):
        with self.assertRaises(ValueError):
            check_version("1.0", "1.0", "approx")


class RunTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.root = Path(self.dir.name)
        (self.root / "mise.toml").write_text('[tools]\ngo = "1.27.2"\n')
        self.check = Check("go", "go.mod", r"(?m)^go (\S+)$", "le")

    def tearDown(self):
        self.dir.cleanup()

    def test_passes_when_versions_agree(self):
        (self.root / "go.mod").write_text("module x\n\ngo 1.27.0\n")
        self.assertEqual(run(self.root, [self.check]), [])

    def test_reports_a_drifted_version(self):
        (self.root / "go.mod").write_text("module x\n\ngo 1.28.0\n")
        [failure] = run(self.root, [self.check])
        self.assertIn("1.28.0 is not le mise.toml 1.27.2", failure)

    def test_reports_a_pattern_that_matches_nothing(self):
        (self.root / "go.mod").write_text("module x\n")
        [failure] = run(self.root, [self.check])
        self.assertIn("no go version found", failure)

    def test_reports_a_tool_missing_from_mise_toml(self):
        (self.root / "go.mod").write_text("module x\n\ngo 1.27.0\n")
        [failure] = run(self.root, [Check("bun", "go.mod", r"(?m)^go (\S+)$", "le")])
        self.assertIn("no [tools] entry for bun", failure)


if __name__ == "__main__":
    unittest.main()
