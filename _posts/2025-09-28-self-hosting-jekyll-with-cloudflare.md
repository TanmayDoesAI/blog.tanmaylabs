---
layout: post
title: "How I Host This Blog on a Raspberry Pi for Free"
date: 2025-09-28 10:00:00 -0000
categories: [homelab, tutorial]
tags: [jekyll, docker, cloudflare, self-hosting, raspberry-pi, tutorial]
author: Tanmay Jain
excerpt: "A step-by-step guide to taking a local Jekyll blog and securely exposing it to the world using a custom domain and Cloudflare Tunnels, no open ports required."
---

In my first post, I mentioned that this blog runs on a Raspberry Pi in my room. It's not just a fun experiment, it's a practical way to own my platform from the hardware up. This article is the complete, step by step guide on how you can do the same.

The entire code is available on GitHub at [TanmayDoesAI/blog.tanmaylabs](https://github.com/TanmayDoesAI/blog.tanmaylabs). Right now, the `main` branch has the starter source code. I’ll keep pushing my own articles and tweaks into the `prod` branch as things change. It's built with Jekyll and Docker, and while I serve it from my Pi, the setup is incredibly flexible. You can run the Docker environment on a personal server, a VPS, or a platform like Railway. Also, you can just build the static site and deploy it to GitHub Pages, Netlify, or Vercel.

This guide focuses on the self hosting route. We'll take a local Jekyll site and make it live with a custom domain. We will use Cloudflare Tunnels to do it securely, so we have no need to open a port on the router, which can make the device vulnerable to attacks if not done correctly.

### Step 1: Get a Domain

Before we can put anything online, we need a domain. If you're tight on budget like me, here are a couple of great ways to get one:

-   **[GitHub Student Developer Pack (Free)](https://education.github.com/pack):** Students can get a free .me domain for one year via the GitHub Student Pack (Namecheap/Name.com).

-   **GoDaddy & Other Registrars (Low-Cost):** For others, look out for promotional pricing. GoDaddy frequently runs campaigns where domains start at around ₹200 for the first year.

![GitHub Student Pack Domain Offers](/assets/images/posts/github-student-pack.png)

After you register the domain, move on to connecting it to Cloudflare.

### Step 2: Connect Your Domain to Cloudflare

Cloudflare is the backbone of this setup. It gives your site HTTPS, which prevents modern browsers from blocking it and tells visitors your connection is secure and protects you from malicious traffic. Most importantly, it gives us access to **[Cloudflare Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)**.

1.  Sign up for a [free Cloudflare account](https://www.cloudflare.com/).
2.  From the dashboard, click 'Add a Site' and enter your domain name.
3.  Cloudflare will present you with two nameservers (something like `abc.ns.cloudflare.com`). Copy these two addresses.
4.  Log in to your domain registrar (Namecheap, GoDaddy) and look for the DNS settings. Change the present nameservers to the new ones.

![Changing to cloudflare nameservers](/assets/images/posts/namecheap-dns.png)

This change tells the internet to look to Cloudflare for instructions on where to find your website. It can take anywhere from a few minutes to a few hours to update. In my case, it took about 10 minutes, and I got an email from Cloudflare informing that my site was active.

### Step 3: Install cloudflared on your device

`cloudflared` is the CLI that creates the secure link between your device and Cloudflare’s network.

I'm installing it directly on the host machine rather than inside the Docker container. This approach works better since you can use the same `cloudflared` instance to expose other services or projects on different subdomains later.

Following are the commands to set it up:

*   **macOS (Homebrew):**
    ```bash
    brew install cloudflared
    ```
*   **Debian/Ubuntu:**
    ```bash
    # Add Cloudflare's GPG 
    curl -L https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-archive-keyring.gpg >/dev/null

    # Add the repository
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-archive-keyring.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list

    # Update and install
    sudo apt update && sudo apt install -y cloudflared
    ```

For other systems, check the [Cloudflare downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).

Once installed, connect it to your Cloudflare account:

```sh
cloudflared tunnel login
```
![cloudflared login output](/assets/images/posts/cloudflared-login-terminal.png)

This will open a browser window to authorize your server. Pick the domain you just added.

![Authorizing the tunnel](/assets/images/posts/cloudflare-auth-browser.png)

### Step 4: Create and Run the Tunnel

Now we will create a tunnel, configure it to point to our local blog, and run it.

**1. Create the Tunnel:**
Give your tunnel a name. Let's say `jekyll-blog`.

```sh
cloudflared tunnel create jekyll-blog
```
This creates a persistent tunnel and outputs a credential file in `~/.cloudflared/`.

**2. Configure the Tunnel:**
Next, we will tell the tunnel where to send traffic by creating a configuration file at `~/.cloudflared/config.yml`. You'll need to point it to your tunnel's credential file and map your domain to your local Jekyll service at `http://localhost:3001`.

```yaml
# ~/.cloudflared/config.yml

tunnel: jekyll-blog
credentials-file: /root/.cloudflared/YOUR_TUNNEL_UUID.json #path to your credentials file,
ingress:
  - hostname: yourdomain.me
    service: http://localhost:3001
  - service: http_status:404
```

**3. Link Your Domain to the Tunnel:**
This command creates the DNS record in Cloudflare, pointing your public domain to your tunnel.

```sh
cloudflared tunnel route dns jekyll-blog yourdomain.me
```

**4. Run It!**
Finally, start the tunnel to test it:
```sh
cloudflared tunnel run jekyll-blog
```
You should see output confirming the connection.

![tunnel connection log in the terminal](/assets/images/posts/cloudflared-run-success.png)

Now, open a browser and navigate to your domain. Your local Jekyll site should be live for the world to see!

### Step 5: Making It Permanent

To keep the site running after a reboot, both the blog and tunnel need to start automatically.

1.  **Docker Container:** The Compose file uses `restart: unless-stopped`, so Docker will auto-start the Jekyll container on boot.

2.  **Cloudflare Tunnel:** Install the tunnel as a service to run on startup:

    ```bash
    sudo cloudflared service install
    ```

That's it, your blog will now run from your own machine and will restart after reboots.