// ocr_mac.swift - offline text recognition with Apple Vision, used by quality_gate.py on macOS.
// usage: swift ocr_mac.swift img1.png img2.png ...   -> one JSON line per image: {"file":..., "texts":[{"text":..,"conf":..,"box":[x,y,w,h]}]}
import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
    var items: [[String: Any]] = []
    if let img = NSImage(contentsOfFile: path),
       let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) {
        let req = VNRecognizeTextRequest()
        req.recognitionLevel = .accurate
        req.usesLanguageCorrection = false
        req.recognitionLanguages = ["en-US", "tr-TR"]
        let h = VNImageRequestHandler(cgImage: cg, options: [:])
        try? h.perform([req])
        for o in (req.results ?? []) {
            if let c = o.topCandidates(1).first {
                let b = o.boundingBox
                items.append(["text": c.string, "conf": Double(c.confidence),
                              "box": [Double(b.origin.x), Double(b.origin.y), Double(b.size.width), Double(b.size.height)]])
            }
        }
    }
    let obj: [String: Any] = ["file": path, "texts": items]
    if let d = try? JSONSerialization.data(withJSONObject: obj), let s = String(data: d, encoding: .utf8) { print(s) }
}
