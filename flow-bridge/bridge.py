"""Local job queue between Python and the Vidbucks Flow Bridge Chrome extension (127.0.0.1 only)."""
import json, queue, threading, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST, PORT = "127.0.0.1", 8765


class Bridge:
    def __init__(self):
        self.jobs: "queue.Queue[dict]" = queue.Queue()
        self.results: dict[str, dict] = {}
        self.cv = threading.Condition()
        self.last_poll = 0.0
        bridge = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _cors(self):
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")

            def do_OPTIONS(self):
                self.send_response(204); self._cors(); self.end_headers()

            def do_GET(self):
                if self.path != "/poll":
                    self.send_response(404); self.end_headers(); return
                bridge.last_poll = time.time()
                try:
                    job = bridge.jobs.get(timeout=20)
                except queue.Empty:
                    self.send_response(204); self._cors(); self.end_headers(); return
                body = json.dumps(job).encode()
                self.send_response(200); self._cors()
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers(); self.wfile.write(body)

            def do_POST(self):
                n = int(self.headers.get("Content-Length", 0))
                data = json.loads(self.rfile.read(n) or b"{}")
                if self.path == "/result":
                    with bridge.cv:
                        bridge.results[data["id"]] = data["result"]
                        bridge.cv.notify_all()
                self.send_response(200); self._cors(); self.end_headers()

        self.server = ThreadingHTTPServer((HOST, PORT), H)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def connected(self) -> bool:
        return time.time() - self.last_poll < 30

    def wait_connected(self, timeout=100):
        end = time.time() + timeout
        while time.time() < end:
            if self.connected():
                return True
            time.sleep(0.5)
        raise RuntimeError("extension not connected: load flow-bridge/extension unpacked in Chrome and open a flow.google.com tab")

    def call(self, cmd: str, timeout=60, **args) -> dict:
        jid = uuid.uuid4().hex
        self.jobs.put({"id": jid, "cmd": cmd, "args": args})
        end = time.time() + timeout
        with self.cv:
            while jid not in self.results:
                left = end - time.time()
                if left <= 0:
                    raise TimeoutError(f"{cmd} timed out after {timeout}s")
                self.cv.wait(left)
            return self.results.pop(jid)
