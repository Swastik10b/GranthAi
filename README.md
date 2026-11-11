# GranthAI

**A whole team around every child.** GranthAI is an AI learning ecosystem for children aged 8 to 17, starting with Ireland's DEIS schools, children in care and the NGOs that support them.

This repository holds:

| Folder | What it is |
|---|---|
| `site/` | The website: a static site with no build step. This is the folder Cloudflare Pages serves. |
| `video/` | The source for the demo video (`site/assets/granthai-demo.mp4`): the narration script, the animated scenes and the render script. |
| `tools/` | Helper scripts used to build the logo, the narration and the final video. |

## Deploy the website to Cloudflare Pages

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**, and pick this repository.
2. Use these build settings:
   - **Framework preset:** None
   - **Build command:** leave empty
   - **Build output directory:** `site`
3. Click **Save and Deploy**. Every push to `main` redeploys the site.
4. To use your own domain, open the project, go to **Custom domains** and add it.

`site/_headers` sets security headers and caching for Cloudflare. The largest file is the demo video, which stays under Cloudflare Pages' 25 MiB per-file limit.

To preview locally:

```bash
cd site && python3 -m http.server 8000     # then open http://localhost:8000
```

## Before you go live

- **Contact email:** the Contact section lists UCD but no email address. Add one in `site/index.html` (search for `id="contact"`).
- **Survey link:** the site links to the public form (`/viewform`), not the editor link. Check the form is set to accept responses from anyone with the link.
- **School names:** the survey section does not name the two schools. Add names only with the principals' permission.

## The website

- `index.html`: quote and introduction, the vision, the demo video and the interactive app, principal survey results, global vision, team and contact.
- `app-demo.js`: the interactive app. It runs in the browser on fictional demo data and mirrors the backend's algorithms: Bayesian knowledge tracing, misconception diagnosis with a hint ladder, a ranked feed, k-means interest clusters with a mixed-school constraint, and mentor scoring.
- `site.js`: menu, reveal-on-scroll and the survey charts. Survey numbers live at the top of the `SURVEY` object, so update them there as responses come in.
- Fonts are self-hosted (Inter, Martel, Tiro Devanagari Sanskrit, all SIL Open Font License), so the site makes no calls to Google.

## The logo

The mark is a grantha, a palm-leaf manuscript bound with a single thread. In Sanskrit, *grantha* means a book, from the root *granth*, "to tie together". The thread rises into a small network for the AI. The wordmark is set in Martel ExtraBold with a Devanagari-style headline (shirorekha) joining the lowercase letters. `tools/wordmark.py` rebuilds it as SVG paths.

## The demo video

The narration is generated offline with Kokoro-82M (Apache-2.0) and the `af_heart` voice. To rebuild:

```bash
python3 tools/tts.py video/narration.json out/vo af_heart   # narration and timings
python3 -m http.server 8766 &                                # serve the repo root
node video/render.js scenes                                  # one MP4 per scene
python3 tools/assemble.py                                    # join scenes, add narration and captions
```

The tools expect the Kokoro model, the voices file and the misaki lexicons in a local folder (see the paths at the top of `tools/tts.py`). Children, schools and mentors in the video are fictional, and the general chatbot reply is an illustrative reconstruction.

## The backend

The Python prototype (tutor agent, safety layer and community engine) is kept out of this public repository. The interactive demo in `site/app-demo.js` mirrors its algorithms in simplified form.
