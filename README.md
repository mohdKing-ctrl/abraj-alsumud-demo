# أبراج الصمود - نسخة تجريبية / Abraj Alsumud - demo

A static demo of the Abraj Alsumud system (Plan 4: point of sale + website). No server, no database, no passwords.
Example data only: every name, number, price, bill and message inside is an example. Whatever a visitor tries is saved
in his own browser only; the **Reset demo** button puts the example data back.

| Page | Address |
|---|---|
| Website | `index.html` |
| Sign-in (press "Sign in", no password) | `login/index.html` |
| Point of sale | `pos/index.html` |
| Website control panel | `admin/index.html` |

To publish: upload the contents of this folder to any static host (GitHub Pages: push it as its own repository and switch
Pages on for the main branch; or copy it into a folder of an existing site).
Built by `node tools/make-demo.js` from the real project. Do not edit these files by hand: rebuild instead.
