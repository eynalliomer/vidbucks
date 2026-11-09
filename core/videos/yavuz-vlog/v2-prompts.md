# Yavuz Sultan Selim Vlog - v2 "Sakal Günü, 1516"

## v1 review (what we measured / saw)
- 10 clips, 80 s. All 10 Turkish lines spoken correctly (Whisper check). Face, mustache, turban, kaftan consistent.
- Problems:
  1. Every scene is a separate statement in a separate place - no journey, no cause->effect between clips.
  2. Same framing in 8 of 10 clips: centred frontal medium shot, almost static. No walking, no handheld life, no reveal.
  3. ~1/3 dead air: speech ends at 3 s in clips 2, 3, 7 and the rest of the 8 s is a still stare (26 of 80 s silent).
  4. No camera-holder character, no reactions from others, no modern-day comparison, no "you" address - the comedy has no engine.
  5. Text artifacts: "SELIM" burned in top-right of clip 4 (reference name leaked); readable Arabic on tiles (clip 1) and on the paper (clip 9).
  6. Barber never actually works; map/poem scenes are isolated facts.

## Tudor formula vs ours
| Device | Tudor (observed) | v1 | v2 |
|---|---|---|---|
| Myth hook from comments | "You keep saying I bathed once a month. Rude." | "Hepiniz aynı şeyi soruyorsunuz" (vague) | "Yorumlarda hep aynı soru: Yavuz'un sakalı neden yok?" |
| One topic = one journey | bath day, room to room | 10 unrelated facts | Beard day: hamam -> barber -> divan -> terrace |
| Off-screen filmer gag | "Kate, film me" | none | Hasan, the page who films ("eskiden kâtipti, terfi etti") |
| Modern comparison | "You call it sauna. I had it first." | none | "Siz buna jilet diyorsunuz. Biz buna cesaret diyoruz." |
| Others react | servants, Kate | barber/vizier frozen | barber trembles, viziers flinch, Hasan's camera shakes |
| Long talking takes, short B-roll under VO | yes | all 8 s, half silent | talk fills 7-8 s; one VO cutaway |
| Outro question + CTA joke | "How long does your bath take? ... I will check." | CTA only | question + callback |

## Continuity rules (new)
- Each clip ENDS on the action the next clip STARTS with (walks to a door -> next clip starts coming through it).
- Same-room pairs (1->2, 3->4): if Flow offers a start frame for the model, use the last frame of the previous clip as the start frame of the next.
- Never write the reference name as visible text; say "the sultan from the reference". Add "no writing anywhere".
- Every clip has speech or reaction until ~7.5 s; one deadpan pause max.

## Global block (start of every prompt)
Photorealistic historical vlog that looks like genuine smartphone footage recorded in 1516 inside Topkapi Palace, Istanbul; no phone, camera or crew visible. The sultan exactly as in the reference image: lean hard face, thick long black mustache, clean-shaven chin with NO beard, tall white turban with a gold jewelled aigrette and black feather, crimson silk kaftan with gold buttons, striped sash, jade-hilted dagger; same face and clothes in every frame. Natural window and lamp light, real skin texture, no beauty filter. Lively handheld camera: walking bounce, small reframes, autofocus breathing, slight front-camera wide-angle distortion. Dry deadpan humour. He speaks Turkish at a natural pace, lips synced; he keeps talking or reacting until the end of the clip, no long frozen stare. Ambient sound only. No music, no subtitles, no captions, no names, no writing or letters anywhere in the image, no logos, no modern objects.

## Clips (8 s each, ~64 s total, ~48 credits at 360p)
1 HOOK - steamy marble hamam, morning. Arm's-length selfie, very close, slight fisheye, lens fogging at the edges. White shaving foam on his chin and cheeks, mustache untouched. He wipes the lens with his thumb and says: "Selam olsun, kullarım. Yorumlarda hep aynı soru: Yavuz'un sakalı neden yok?" Short pause, raises an eyebrow. "Gelin. Gösteriyorum." He turns and starts walking toward a bright arched doorway. Sound: dripping water, echo, steam hiss.

2 (continues 1) - walking selfie out of the steam through the arched doorway into a marble corridor; behind him a nervous palace barber in a brown robe hurries after them holding a brass bowl and a straight razor, hands trembling. The sultan tilts the lens to show him: "Bu berberbaşı. Elleri titriyor." Beat. "Herkesin elleri titriyor." He reaches a window alcove with a red cushion and sits down at the end. Sound: footsteps, splashing bowl, robes.

3 (continues 2) - third-person handheld, eye level, as if the young page Hasan films from two metres, a bit too shaky. The sultan sits on the red cushion by a latticed window; the barber carefully shaves the foam off his chin with the straight razor. The sultan looks at the camera: "Hasan, yaklaş." The camera jerks closer. "Hasan kameramanım. Eskiden kâtipti." Beat. "Terfi etti." The barber freezes, razor in the air. Sound: razor scrape, nervous breathing.

4 (continues 3) - selfie close-up, the barber's hand wiping the last foam from his clean chin with a white cloth. Deadpan: "Siz buna jilet diyorsunuz. Biz buna cesaret diyoruz." Pause. Leaning in, quieter: "Sakal olursa vezirler tutup çekecek bir şey bulur." Beat. "Bulamasınlar." He stands up. Sound: cloth, birds outside.

5 CUTAWAY under voice-over (no lip-sync) - cinematic hidden-observer view through a carved wooden screen into the divan antechamber: three elderly viziers in tall white turbans whisper; each nervously pats a folded paper inside his robe. Off-screen, the sultan's calm deep voice: "Vezirlerim beni çok sever." Beat. "Vasiyetlerini hep yanlarında taşırlar." The viziers turn toward an opening door. Sound: whispering, door creak.

6 (continues 5) - walking selfie through that door into the antechamber; the three viziers bow far too low and stay frozen. He walks past them and turns the lens so they stay in frame: "Günaydın vezirlerim." One of them squeaks. He whispers to the lens: "Hepsi hâlâ vezir." Pause. "Şimdilik." He keeps walking toward a sunlit terrace door. Sound: robes, a nervous swallow.

7 (continues 6) - Hasan follows from behind with a shaky walking shot onto a palace terrace at dawn over the Bosphorus, wooden ships in the mist. The sultan stops at the balustrade, turns: "Bu yıl Mısır'a gidiyoruz. Çölden." Hasan's camera dips. "Çölü sevmiyor musun, Hasan?" Beat. "Ben de sevmiyorum. Gidiyoruz." Sound: wind, gulls.

8 OUTRO - same terrace, selfie very close, wind moving the turban feather: "Yorumlara yazın: sakalınızı kim kesiyor?" Beat. "Kendiniz mi? Cesur." Pause. "Abone olun, kullarım. Yavuz'a vezir olmaktan kolaydır." He reaches to stop the recording. Sound: wind, then silence.

## History notes
- Clean-shaven chin with mustache: shown in his portraits. "Viziers would have nothing to grab" and "viziers carried their wills": popular anecdotes (rivayet).
- Berberbaşı was a real palace office. Mamluk campaign 1516-17 (Mercidabık, Ridaniye) and the Sinai crossing are real.
- Barber, Hasan, viziers are fictional.
