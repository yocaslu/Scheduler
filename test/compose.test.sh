#!/usr/bin/env bash
# shellcheck disable=SC2015  # padrão "teste && ok || falha": ok/falha nunca falham
# Fronteira com o proxy reverso (repositório "caddy"): em produção nenhum serviço publica porta, só o
# app entra na rede externa scheduler-borda (com o alias scheduler-app) e o cookie é Secure.
# Uso, a partir da raiz: pnpm test:compose   (ou bash test/compose.test.sh; exige Docker e jq)
set -u
cd "$(dirname "$0")/.." || exit 1
falhas=0
ok()    { echo "PASS: $1"; }
falha() { echo "FAIL: $1"; falhas=$((falhas + 1)); }

# Variáveis só para o "config" resolver; nada sobe. REDE_BORDA removida: vale o padrão de produção.
cfg() { env -u REDE_BORDA DB_NAME=x DB_USER=x DB_PASSWORD=x docker compose "$@" config --format json; }
prod=$(cfg -f docker-compose.yml) || { echo "FAIL: docker compose config (produção)"; exit 1; }
dev=$(cfg -f docker-compose.yml -f docker-compose.dev.yml) || { echo "FAIL: docker compose config (dev)"; exit 1; }
q() { jq -r "$2" <<<"$1"; }

[ "$(q "$prod" '[.services[] | select(.ports)] | length')" = 0 ] \
  && ok "produção: nenhum serviço publica porta (a 443 é do proxy)" || falha "produção: algum serviço publica porta"
[ "$(q "$prod" '[.services[] | (.image // "") | select(test("caddy|nginx|traefik"))] | length')" = 0 ] \
  && ok "produção: sem proxy neste compose" || falha "produção: há um proxy neste compose"
[ "$(q "$prod" '.services | to_entries | map(.value.labels // {} | keys[]) | map(select(startswith("traefik"))) | length')" = 0 ] \
  && ok "produção: sem labels do Traefik" || falha "produção: sobrou label do Traefik"
[ "$(q "$prod" '.networks.borda | "\(.name) \(.external)"')" = "scheduler-borda true" ] \
  && ok "produção: rede borda externa scheduler-borda" || falha "produção: rede borda errada ($(q "$prod" '.networks.borda'))"
[ "$(q "$prod" '.services.app.networks | keys | sort | join(",")')" = "borda,default" ] \
  && ok "app nas redes borda e default" || falha "app deveria estar em borda e default"
[ "$(q "$prod" '.services.app.networks.borda.aliases | join(",")')" = "scheduler-app" ] \
  && ok "app com o alias scheduler-app na borda" || falha "app sem o alias scheduler-app na borda"
for s in db migrate; do
  [ "$(q "$prod" ".services.$s.networks | keys | join(\",\")")" = "default" ] \
    && ok "$s só na rede default (fora do alcance do proxy)" || falha "$s não pode entrar na rede borda"
done
[ "$(q "$prod" '.services.app.environment.COOKIE_SECURE')" = true ] \
  && ok "produção: COOKIE_SECURE=true" || falha "produção: COOKIE_SECURE deveria ser true"
# Um COOKIE_SECURE=false esquecido no .env não pode desligar o cookie Secure em produção.
[ "$(COOKIE_SECURE=false q "$(COOKIE_SECURE=false cfg -f docker-compose.yml)" '.services.app.environment.COOKIE_SECURE')" = true ] \
  && ok "produção: COOKIE_SECURE não é lido do ambiente" || falha "produção: COOKIE_SECURE do ambiente vazou para o app"

[ "$(q "$dev" '.networks | has("borda")')" = false ] && [ "$(q "$dev" '.services.app.networks | keys | join(",")')" = default ] \
  && ok "dev: sem a rede do proxy" || falha "dev: não deveria usar a rede borda"
[ "$(q "$dev" '[.services[] | .ports[]? | .host_ip] | unique | join(",")')" = "127.0.0.1" ] \
  && ok "dev: portas só no loopback" || falha "dev: porta publicada fora do loopback"
[ "$(q "$dev" '.services.app.environment.COOKIE_SECURE')" = false ] \
  && ok "dev: COOKIE_SECURE=false (HTTP direto)" || falha "dev: COOKIE_SECURE deveria ser false"

[ "$falhas" -eq 0 ] && { echo "TUDO OK"; exit 0; }
echo "$falhas falha(s)"; exit 1
