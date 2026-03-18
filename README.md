# Lorem Gypsum VSCode Themes

> *"Your code was already hard to read. The rainbow syntax highlighting wasn't helping."*

Lorem Gypsum pairs the stock VSCode UI you already know (and have strong feelings about) with [Alabaster](https://github.com/tonsky/vscode-theme-alabaster)-style minimal syntax highlighting. The result looks almost exactly like your current theme, except your eyes will finally stop twitching.

## What's different

### ...from most themes
Most themes try to assign a unique color to every conceivable token type — keywords, operators, type parameters, escape sequences, decorators, the third argument of a lambda in a file that hasn't compiled since 2019. Lorem Gypsum does not do this.

Instead, it uses roughly 10 colors, total. You get bolds and italics for the things that matter and calm, understated color for the things that don't. Your string literals are highlighted. Your function calls are not. You will get used to it faster than you think, and then you will wonder why you ever needed 47 distinct colors to read a for-loop.

Semantic highlighting is also disabled. Your language server has opinions. This theme does not share them.

### ...from Alabaster
I agree with tonsky's analysis of syntax highlighting having gone off the rails. I don't agree with everything other than syntax looks with the dark variant of Alabaster - VSCode got the rest of the UI looking pretty slick. Why not have both?

## Variants

One variant for every built-in VSCode theme, so I could finally put the "it doesn't match my system UI" ick to rest.

| Theme | Base |
|-------|------|
| Lorem Gypsum Dark Modern | Dark Modern |
| Lorem Gypsum Light Modern | Light Modern |
| Lorem Gypsum Dark+ | Dark+ |
| Lorem Gypsum Light+ | Light+ |
| Lorem Gypsum 2026 Dark | 2026 Dark |
| Lorem Gypsum 2026 Light | 2026 Light |
| Lorem Gypsum Dark (Visual Studio) | Dark VS |
| Lorem Gypsum Light (Visual Studio) | Light VS |
| Lorem Gypsum High Contrast | High Contrast |
| Lorem Gypsum High Contrast Light | High Contrast Light |

## How the colors are picked

They're hand-picked from the colors that the default themes use, but used the way Alabaster uses them - Strings are whichever green the default theme uses, function calls are whichever shade of blue I liked the most from that theme, etc.

You can see the mapping in extract-colors.js. The idea is that Lorem Gypsum should not define any colors on its own (the author doesn't know a thing about color theory), so we're only referencing tokens defined in the theme we're stealing from.

## Installation

Find it in the VSCode Extension Marketplace once it's there, OpenVSIX if I ever get around to publishing it there, or build&install the `.vsix` manually if you have trust issues with marketplaces ().

## FAQ

### Will this make me a better programmer?
No, but it will make debugging at 2am marginally less of an assault on your retinas.

### Why is it called Lorem Gypsum?
Alabaster is a type of gypsum. Lorem Ipsum is the world's default filler text.

### There's theme XYZ with terrible syntax highlighting, but I like the UI colors. Can you support that?
Possibly. Shouldn't be more than referencing the file in `fetch-upstream.js` and a mapping in `extract-colors.js`. PRs are welcome.

### This token in the language I like most is highlighted wrong or not at all. Can you fix it?
As long as it fits into the categories that Alabaster would highlight. Issues and PRs are welcome. 

### I can't live without [obscure feature in this arcane language] being highlighted in a color nothing else shares. Can you support that?
You might be more at home with Catppuccin.

### Where are the screenshots?
Patience, young one.