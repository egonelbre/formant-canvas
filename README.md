# Formant Canvas

A web-based voice synthesis and visualization tool for exploring how the human voice works.

## What is this?

Formant Canvas lets you manipulate the building blocks of voice -- fundamental frequency, formant filters, vibrato, and phonation type -- and immediately hear and see the results. Every parameter change updates the sound and all visualizations simultaneously: harmonics lighting up on a piano keyboard, a dot moving on the vowel chart, formant range overlays shifting in real time.

This "linked exploration" is the core idea. Instead of reading about how formants shape vowel quality, you drag a formant and watch the vowel change while hearing it happen.

## Who is it for?

Formant Canvas is built for anyone curious about voice acoustics:

- **Singers** exploring how vowel modification and resonance tuning affect their sound
- **Voice teachers** demonstrating formant-harmonic relationships to students
- **Students** learning the basics of source-filter theory hands-on
- **Researchers** who want a quick interactive reference for formant behavior

## Inspiration

The project is inspired by [Madde](https://www.tolvan.com/index.php?p=/madde/index.php), a voice synthesis tool developed by Svante Granqvist at KTH. Formant Canvas aims to bring similar capabilities to the browser with a modern interface built around direct manipulation and guided presets -- no installation required.

## Getting started

Formant Canvas is a static web application. To run it locally:

```
npm install
npm run dev
```

Then open the URL shown in your terminal (usually `http://localhost:5173`). No backend or server-side setup is needed.

## Built with

Svelte and the Web Audio API.
