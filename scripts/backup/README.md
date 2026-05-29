# Backup noturno do Firestore

Script que o workflow `.github/workflows/nightly-backup.yml` executa todas as
noites (03:00 BRT / 06:00 UTC) para exportar a coleção `users` do Firestore
para um JSON, que é guardado como **artifact do GitHub Actions** com 30 dias de
retenção.

## Conteúdo do JSON exportado

```json
{
  "exportedAt": "2026-05-29T06:00:00.000Z",
  "project": "gerenciador-financeiro-1d910",
  "count": 1,
  "users": {
    "<uid>": {
      "state": { /* o mesmo state usado pelo app */ },
      "updatedAt": "2026-05-29T05:59:12.345Z"
    }
  }
}
```

O campo `users.<uid>.state` tem o mesmo formato do "Exportar JSON" / "Importar
JSON" da sidebar do app — para restaurar, basta colar **apenas o conteúdo do
`state`** no botão "Importar JSON" do usuário desejado.

## Configuração inicial (uma vez)

### 1. Firebase: chave de service account

1. https://console.firebase.google.com/ → projeto **gerenciador-financeiro-1d910**.
2. Engrenagem → **Configurações do projeto** → aba **Contas de serviço**.
3. **Gerar nova chave privada** → baixa um `.json`.

### 2. Secret no GitHub

No repo `srocupado/gerenciador-financeiro` →
**Settings → Secrets and variables → Actions → New repository secret**:

- Nome: `FIREBASE_SERVICE_ACCOUNT`
- Valor: cole o conteúdo inteiro do JSON do passo 1 (com chaves e tudo).

Apague o JSON local depois de salvar o secret.

### 3. Primeiro disparo manual

GitHub → **Actions** → **nightly-backup** → **Run workflow** → branch `main` →
**Run**. Em ~30s o job termina; o artifact aparece no rodapé da página do run.

## Uso local (dry-run e geração)

```bash
cd scripts/backup
npm ci

# Dry-run: lê o Firestore e imprime o resumo, sem escrever em disco
FIREBASE_SERVICE_ACCOUNT="$(cat /caminho/para/sa.json)" node backup.mjs --dry-run

# Real: grava out/gerenciador-backup.json
FIREBASE_SERVICE_ACCOUNT="$(cat /caminho/para/sa.json)" node backup.mjs
```

## Como restaurar um backup antigo

- **UI:** Actions → run da data desejada → seção *Artifacts* → baixa o `.zip`.
- **CLI:** `gh run download <run-id> -n gerenciador-backup-<run_id>`.

O artifact contém só o `gerenciador-backup.json`. Abra, copie o conteúdo de
`users.<uid>.state` e cole no "Importar JSON" da sidebar.

## Ajustes comuns

- **Mudar retenção:** edite `retention-days: N` no workflow (1–90).
- **Mudar horário:** edite o `cron` no workflow. O atual `0 6 * * *` é 06:00
  UTC = 03:00 BRT.
