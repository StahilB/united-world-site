# Next.js 14 — standalone output (see next.config.mjs `output: "standalone"`)
# Base: Alpine + Mozilla CA bundle + Russian trusted roots (GigaChat / Сбер TLS)
FROM node:20-alpine AS base
RUN apk add --no-cache ca-certificates wget \
  && mkdir -p /usr/local/share/ca-certificates/russian-trusted \
  && wget -q -O /usr/local/share/ca-certificates/russian-trusted/russian_trusted_root_ca_pem.crt \
    https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt \
  && wget -q -O /usr/local/share/ca-certificates/russian-trusted/russian_trusted_sub_ca_pem.crt \
    https://gu-st.ru/content/lending/russian_trusted_sub_ca_pem.crt \
  && chmod 644 /usr/local/share/ca-certificates/russian-trusted/*.crt \
  && update-ca-certificates

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for NEXT_PUBLIC_* — inlined at build time into the client bundle
ARG NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
ARG NEXT_PUBLIC_SITE_URL=https://anounitedworld.com
ARG NEXT_PUBLIC_YANDEX_VERIFICATION=
ARG NEXT_PUBLIC_GOOGLE_VERIFICATION=
ARG NEXT_PUBLIC_MAILRU_VERIFICATION=
ARG NEXT_PUBLIC_YANDEX_METRICA_ID=
ARG NEXT_PUBLIC_YM_WEBVISOR=true

ENV NEXT_PUBLIC_STRAPI_URL=${NEXT_PUBLIC_STRAPI_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_YANDEX_VERIFICATION=${NEXT_PUBLIC_YANDEX_VERIFICATION}
ENV NEXT_PUBLIC_GOOGLE_VERIFICATION=${NEXT_PUBLIC_GOOGLE_VERIFICATION}
ENV NEXT_PUBLIC_MAILRU_VERIFICATION=${NEXT_PUBLIC_MAILRU_VERIFICATION}
ENV NEXT_PUBLIC_YANDEX_METRICA_ID=${NEXT_PUBLIC_YANDEX_METRICA_ID}
ENV NEXT_PUBLIC_YM_WEBVISOR=${NEXT_PUBLIC_YM_WEBVISOR}

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
