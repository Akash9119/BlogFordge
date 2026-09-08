# Deploying BlogForge to Oracle Cloud

Everything runs on **one Oracle Cloud compute instance** — an Always Free
Ampere shape is more than enough — behind Caddy, which terminates TLS and
serves the SPA.

```
                    Internet
                       │  :80 / :443
              ┌────────▼─────────┐
              │  web  (Caddy)    │  ← the only published port
              │  SPA + TLS +     │
              │  reverse proxy   │
              └───┬──────────────┘
                  │ /api/*        private docker network
              ┌───▼──────────────┐        ┌──────────────────┐
              │  api  (Node)     ├───────►│  ai  (FastAPI)   │
              │  auth boundary   │ token  │  no public port  │
              └───┬──────────────┘        └────────┬─────────┘
                  │                                │
                  └────────► MongoDB Atlas ◄───────┘
                             Cloudinary · OpenAI
```

`api` and `ai` are never published to the host. The Node API stays the single
auth boundary and the AI service stays unreachable from the internet — the same
rule the architecture had in development, now enforced by the network topology
instead of by `127.0.0.1`.

**Managed services stay managed.** MongoDB stays on Atlas rather than moving
onto the VM: Oracle's free managed database is Autonomous *SQL*, which this app
cannot use, and self-hosting Mongo on the same box would mean owning backups,
upgrades, and a single point of data loss for no gain. Atlas M0 is free.

---

## Before you start

| You need | Notes |
|---|---|
| Oracle Cloud account | Free tier. A card is required for identity verification; Always Free resources are not charged. |
| MongoDB Atlas cluster | The same `blogforge` DB you already use, or a fresh M0. |
| Cloudinary account | Cloud name + API key + secret. |
| OpenAI API key | Or an OpenAI-compatible endpoint (see `ai-service/.env.example`). |
| A domain *(optional)* | Only needed for HTTPS. Without one you get plain HTTP on the IP. |

Roughly 45 minutes, most of it waiting on Oracle's console.

---

## Step 1 — Create the compute instance

OCI Console → **Compute → Instances → Create instance**.

| Field | Value |
|---|---|
| Name | `blogforge` |
| Image | **Ubuntu 22.04** (or Oracle Linux 9 — the setup script handles both) |
| Shape | **VM.Standard.A1.Flex**, 2 OCPU / 12 GB *(Always Free allows up to 4/24)* |
| Networking | Create a new VCN, **assign a public IPv4 address** |
| SSH keys | Paste your public key, or let Oracle generate one and **download the private key now** — it is shown exactly once |
| Boot volume | 50 GB is plenty (Always Free gives 200 GB total) |

> **"Out of host capacity"** on the A1 shape is the single most common blocker.
> It is a real regional shortage, not a mistake on your part. In order: pick a
> different Availability Domain from the dropdown; retry over the next few
> hours; or fall back to **VM.Standard.E2.1.Micro** (1 GB RAM, x86). The micro
> shape works — the setup script adds swap so the frontend build is not
> OOM-killed — but expect the build to take several minutes.

Note the **public IP address** on the instance page once it finishes
provisioning.

### Reserve the IP (recommended, 30 seconds)

An ephemeral IP changes if the instance is ever stopped and started, which
breaks your DNS record *and* your Atlas allowlist at the same time.

Instance → **Attached VNICs** → click the VNIC → **IPv4 Addresses** → edit the
primary address → **Reserved public IP** → *Create new reserved IP*.

---

## Step 2 — Open ports 80 and 443 in the VCN

OCI Console → **Networking → Virtual Cloud Networks** → your VCN →
**Security Lists** → the default list → **Add Ingress Rules**.

Add two rules:

| Stateless | Source CIDR | IP Protocol | Destination Port Range |
|---|---|---|---|
| No | `0.0.0.0/0` | TCP | `80` |
| No | `0.0.0.0/0` | TCP | `443` |

> This is **half** the firewall. OCI instances also run a host firewall that
> drops 80/443 regardless of what the security list says — with no log and no
> error, so the site simply hangs. `setup-oracle.sh` in the next step opens the
> other half. Skip either one and nothing reaches Caddy.

---

## Step 3 — Bootstrap the instance

SSH in (`ubuntu@` for Ubuntu images, `opc@` for Oracle Linux):

```bash
ssh -i /path/to/private.key ubuntu@<your-public-ip>
```

Then:

```bash
sudo apt-get update -y && sudo apt-get install -y git   # dnf on Oracle Linux
git clone <your-repo-url> blogforge
cd blogforge
bash deploy/setup-oracle.sh
exit          # log out and back in so the docker group applies
```

The script installs Docker + Compose, adds a 2 GB swapfile, and inserts the
host-firewall rules for 80/443 — **persisting** them, so they survive a reboot.

---

## Step 4 — Let Atlas accept the VM

Atlas → **Network Access** → **Add IP Address** → your instance's public IP.

Without this the API container starts, fails to connect, and reports `503` on
`/health` forever. `0.0.0.0/0` also works but means anyone holding your
connection string can reach the data — use the specific IP.

While you are in Atlas, create the vector index the RAG layer retrieves
through: **Atlas Search → Create Search Index → JSON Editor → Vector Search**,
on `blogforge.embeddings`, named `blogforge_vector_index`:

```json
{ "fields": [ { "type": "vector", "path": "embedding",
                "numDimensions": 1536, "similarity": "cosine" } ] }
```

`numDimensions` must equal `EMBEDDING_DIM`. Skipping this is not fatal — with
`VECTOR_SEARCH_MODE=auto` the service falls back to in-memory cosine — but the
index is what keeps retrieval fast as the corpus grows.

---

## Step 5 — Configure the three `.env` files

```bash
cd ~/blogforge
cp .env.example .env
cp Backend/.env.example Backend/.env
cp ai-service/.env.example ai-service/.env
```

Generate fresh secrets on the VM rather than reusing your development ones:

```bash
# JWT_SECRET and JWT_REFRESH_SECRET (two different values)
openssl rand -hex 48

# AI_SERVICE_TOKEN — the same value goes in BOTH Backend/.env and ai-service/.env
openssl rand -hex 32
```

Fill in:

**`.env`** (the edge)
```ini
SITE_ADDRESS=:80              # switch to blog.example.com in Step 7
ACME_EMAIL=you@example.com
PUBLIC_ORIGIN=http://<your-public-ip>
```

**`Backend/.env`**
```ini
NODE_ENV=production
MONGODB_URI=...               # your Atlas SRV string
JWT_SECRET=...                # >= 32 chars, or the API refuses to start
JWT_REFRESH_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
AI_SERVICE_TOKEN=...          # must match ai-service/.env
ADMIN_EMAIL=you@example.com   # used once, by seed:admin
ADMIN_PASSWORD=...
```

`PORT`, `TRUST_PROXY`, `CORS_ORIGINS` and `AI_SERVICE_URL` are set by
`docker-compose.yml` — whatever the file says for those four is ignored.

**`ai-service/.env`**
```ini
ENV=production
MONGODB_URI=...               # the same cluster and database
AI_SERVICE_TOKEN=...          # identical to Backend/.env
OPENAI_API_KEY=...
```

---

## Step 6 — Deploy

```bash
bash deploy/deploy.sh
```

It validates all three `.env` files first — every misconfiguration here
otherwise shows up as a container that exits a second after it starts — then
builds, starts, and waits for the API to report healthy.

First deployment only:

```bash
docker compose exec api npm run seed:admin    # your first admin account
docker compose exec api npm run ai:reindex    # embed existing published posts
```

Visit `http://<your-public-ip>` and log in.

---

## Step 7 — Domain and HTTPS

Skip this if you are staying on the raw IP.

1. At your DNS provider, add an **A record** pointing at the instance's public IP.
2. Wait for it to resolve: `dig +short blog.example.com` should return your IP.
3. Edit `.env`:
   ```ini
   SITE_ADDRESS=blog.example.com
   PUBLIC_ORIGIN=https://blog.example.com
   ```
4. `docker compose up -d`

Caddy requests a Let's Encrypt certificate on startup and renews it
automatically. The certificates live in the `caddy_data` volume — keep it, as
repeated re-issuing runs into Let's Encrypt's rate limits.

DNS must resolve *before* you switch `SITE_ADDRESS`, or the ACME challenge
fails and Caddy retries with a backoff.

---

## Operating it

```bash
docker compose ps                  # what is running
docker compose logs -f api         # follow one service
docker compose logs -f             # everything
docker compose restart api
docker compose exec api npm run ai:reindex -- --force   # re-embed everything
docker stats                       # memory, when you are on the micro shape
```

**Updating:**
```bash
cd ~/blogforge && git pull && bash deploy/deploy.sh
```

**Backups:** the data lives in Atlas and Cloudinary, both of which back
themselves up. The only state on the VM is the `caddy_data` volume
(certificates) and your `.env` files — keep a copy of those `.env` values
somewhere safe, because they are not in git and cannot be recovered from it.

**Cost:** the Always Free A1 shape, its boot volume and 10 TB/month of egress
cost nothing indefinitely. The bills that *can* appear are OpenAI usage
(bounded by `AI_RATE_LIMIT_DAILY`), Atlas above M0, and Cloudinary above its
free tier. Set a budget alert under **Billing → Budgets** anyway.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Browser hangs, no response at all | The host firewall. Re-run `deploy/setup-oracle.sh`, and confirm the VCN ingress rules from Step 2 exist. |
| `/health` returns 503 | Atlas is refusing the connection — the VM's IP is not on the Network Access list, or `MONGODB_URI` is wrong. |
| `api` exits immediately | Missing or short secret in `Backend/.env`. `docker compose logs api` names the exact variable. |
| AI Reports answer "AI service unavailable" | `AI_SERVICE_TOKEN` differs between the two `.env` files, or `OPENAI_API_KEY` is unset. Check `docker compose logs ai`. |
| Frontend build killed during deploy | Out of memory on the micro shape. Confirm swap is on with `swapon --show`. |
| Certificate never issues | DNS does not resolve to this IP yet, or port 80 is closed — Let's Encrypt validates over HTTP first. |
| Login works, then every request 401s | `PUBLIC_ORIGIN` does not match the URL in the address bar (http vs https, IP vs domain). |
| `Cannot connect to the Docker daemon` | You have not logged out and back in since the setup script added you to the `docker` group. |
