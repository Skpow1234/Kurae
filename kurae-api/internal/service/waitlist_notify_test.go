package service

import "testing"

func TestWaitlistNotifyDropURL(t *testing.T) {
	svc := &WaitlistNotifyService{webURL: "https://shop.kurae.dev"}
	got := svc.dropURL("sakura", "tee-drop")
	want := "https://shop.kurae.dev/sakura/tee-drop"
	if got != want {
		t.Fatalf("dropURL() = %q, want %q", got, want)
	}
}
