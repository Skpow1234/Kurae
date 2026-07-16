package httpapi

import (
	"fmt"
	"os"
	"testing"

	"github.com/kurae/kurae-api/internal/testutil"
)

func TestMain(m *testing.M) {
	if err := testutil.ApplyMigrations(); err != nil {
		fmt.Fprintf(os.Stderr, "httpapi tests: migrations: %v\n", err)
		os.Exit(1)
	}
	os.Exit(m.Run())
}
