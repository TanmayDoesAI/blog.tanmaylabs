---
layout: post
title: "Building in Public: Why I'm Finally Starting"
date: 2025-09-21 1:00:00 -0000
categories: [general, announcement]
tags: [homelab, raspberry-pi, immich, casaos, postgres, iot, building-in-public]
author: Tanmay Jain
excerpt: "After months of procrastination, I'm finally starting to share my experiments, projects, and homelab adventures on tanmaylabs.me."
---

For the longest time, I've been telling myself I'll start sharing what I build. Not just the big flashy projects, but the little experiments, the weekend tinkering, the messy half done things that still teach me something new. And for the longest time, I procrastinated.
This is my attempt to finally change that.

I got myself a domain through the GitHub Student Pack from Namecheap: **tanmaylabs.me**. The "labs" part came naturally after a few months of homelabbing and experimenting. I'll be using it as the hub for everything I create. There will be updates on what I'm working on, articles that explain concepts I'm learning, and tutorials that walk through the projects I build. Some of these will be small, some ambitious, but the goal is simple: to share what I do in a way that's open, transparent, and hopefully, useful to others.

## **Starting with the Pi**

This June, I picked up a **Raspberry Pi 5** (8GB). At the time, the idea was to give myself a playground beyond just software development. I wanted something I could experiment with and break without the pressure of deadlines. Over the last few months, it's slowly grown into a small homelab that I spend my weekends experimenting with.

Here's what I've been running on it so far:

- **Immich**: An open-source Google Photos alternative. I now self host my photo library, bye bye 15 GB Google Drive limit, I got my 2TB HDD pulling the weights now.
- **CasaOS**: A home cloud system that makes managing services on the Pi way easier. It provides a clean web interface for everything.
- **Postgres**: Because every project needs a database, and I wanted the experience of running one myself at home, which could become a central DB for my projects.
- **Tailscale**: To make everything accessible to my laptop and phone wherever I am.
- **Dozzle**: A simple container monitoring and logging tool to keep track of my running containers and services.

One of the quirks of running a Pi 24/7 is dealing with power cuts. Instead of buying a dedicated UPS, I tried something unconventional: a **20,000 mAh power bank** as the power source. It's been really effective, and honestly I got it because I wanted a powerbank that would help with my MacBook as well when I'm out or there's a power cut. The Pi stays online even when the lights go out. A scrappy solution, but one that works, and that's the fun of it (So if the site is down, there's a good chance I've had a power cut and I needed the power bank for my MacBook).

## **From a Smart Switch to a Home Lab**
The Pi isn't the only hardware I've been experimenting with. I also built a simple IoT project: converting a regular light switch so I could control it from my phone using just an **ESP board, a 5V relay, and a power supply**. It's nothing fancy, but it reminded me why I enjoy this kind of work. It takes everyday things and makes them bend a little to your curiosity.

Now, the Pi's role is about to evolve again. Along with being my homelab, it will also become the server for **tanmaylabs.me**. That means the articles you're reading now (and the ones coming soon) will be hosted directly from my Raspberry Pi sitting at home. 

In the next few weeks, I'll also start putting up small side projects on subdomains under this domain. Some will be experimental, others practical, some small, some big (hopefully?), but each one will be something I can point to and say: _I built this._

## **Building It My Way**

One thing I've always valued is trying to do things in a way that's a little different. There are plenty of tutorials and templates out there for building apps, blogs, or APIs, and while they're great for learning the basics, I've never wanted to stop there.

What drives me is asking: _How can I make this project reflect my curiosity?_ Maybe that means running a server off a power bank, or wiring up a light switch with a relay, or hosting a personal website from a Raspberry Pi instead of a cloud provider. They're not always the most efficient ways, but they're mine, and they teach me something unique in the process. 

## **What comes next**

This is just the start. In the **next article**, I'll walk through how I set up this website on the Raspberry Pi (or even your laptop) using Jekyll and Cloudflare, step by step, with the code so you can replicate it yourself if you'd like.

For now, this first article is about setting the stage (and hopefully making me accountable). I've finally stopped procrastinating, I have a homelab for the things I build, and I'm excited to share more, both the small wins and the bigger projects.

Here's to building, breaking, and sharing it all, one project at a time.
