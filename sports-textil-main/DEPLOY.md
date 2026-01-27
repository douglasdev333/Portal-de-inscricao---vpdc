# Guia de Deploy - KitRunner

Este guia explica como publicar o KitRunner em produção no Replit.

## Pré-requisitos

Antes de fazer o deploy, certifique-se de que:

1. **Banco de dados PostgreSQL** está configurado e funcionando
2. **Variáveis de ambiente** estão configuradas (veja seção abaixo)
3. **Mercado Pago** está configurado com credenciais de produção

## Variáveis de Ambiente Necessárias

Configure as seguintes variáveis no ambiente de **produção**:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL de conexão do PostgreSQL | `postgresql://user:pass@host/db` |
| `SESSION_SECRET` | Chave secreta para sessões (mín. 32 caracteres) | `sua-chave-secreta-segura-aqui` |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de acesso do Mercado Pago (produção) | `APP_USR-...` |
| `NODE_ENV` | Ambiente de execução | `production` |

### Como Configurar

1. Clique na aba **Secrets** (cadeado) no painel lateral
2. Adicione cada variável com seu valor de produção
3. Para o Mercado Pago, use as credenciais de **produção** (não sandbox)

## Passo a Passo do Deploy

### 1. Verificar se o projeto está funcionando

Antes do deploy, teste localmente:
- Acesse a aplicação e faça um teste de inscrição
- Verifique se o banco de dados está conectado
- Confirme que não há erros no console

### 2. Acessar o Painel de Publicação

1. Clique no botão **Publish** (Publicar) no canto superior direito
2. Ou acesse através do menu de ferramentas

### 3. Escolher Tipo de Deploy

Selecione **Autoscale** - recomendado para aplicações web:
- Escala automaticamente com o tráfego
- Reduz custos quando não há acessos
- Ideal para sites com tráfego variável

### 4. Configurar Recursos

Configuração recomendada para início:
- **CPU**: 0.5 vCPU
- **RAM**: 512 MB
- **Máquinas máximas**: 2-3

Você pode ajustar depois conforme a demanda.

### 5. Configurar Comando de Build

O build é executado automaticamente:
```bash
npm run build
```

### 6. Configurar Comando de Execução

O servidor é iniciado com:
```bash
node dist/index.js
```

### 7. Publicar

1. Revise todas as configurações
2. Clique em **Publish** para iniciar o deploy
3. Aguarde o build e publicação (pode levar alguns minutos)

## Após o Deploy

### URL de Produção

Após publicar, você receberá uma URL no formato:
```
https://seu-projeto.replit.app
```

### Configurar Domínio Personalizado (Opcional)

1. Vá em **Settings** > **Domains**
2. Adicione seu domínio personalizado
3. Configure o DNS conforme instruções

### Configurar Webhook do Mercado Pago

Configure o webhook de pagamentos para a URL de produção:
```
https://seu-projeto.replit.app/api/payments/webhook
```

No painel do Mercado Pago:
1. Acesse **Suas integrações** > **Webhooks**
2. Adicione a URL acima
3. Selecione eventos de **Pagamentos**

## Monitoramento

### Verificar Logs

- Acesse **Logs** no painel do Replit para ver logs em tempo real
- Monitore erros e performance

### Verificar Status

- O Replit mostra o status do deploy no painel
- Verde = funcionando
- Amarelo = reiniciando
- Vermelho = erro

## Troubleshooting

### Erro de Conexão com Banco

- Verifique se `DATABASE_URL` está configurada corretamente
- Confirme que o banco está acessível externamente

### Erro 500 na Aplicação

- Verifique os logs para identificar o erro
- Confirme que todas as variáveis de ambiente estão configuradas

### Pagamentos Não Funcionam

- Verifique se está usando credenciais de **produção** do Mercado Pago
- Confirme que o webhook está configurado corretamente
- Teste com um pagamento real de valor baixo

## Atualizações

Para atualizar a aplicação em produção:

1. Faça as alterações no código
2. Teste localmente
3. Clique em **Publish** novamente
4. O Replit fará o build e deploy automaticamente

## Custos

O deploy no Replit usa **Cycles**:
- Autoscale cobra por uso de CPU/RAM
- Quando não há tráfego, escala para zero (sem custo)
- Monitore seu uso no painel de billing

---

**Dúvidas?** Entre em contato:
- WhatsApp: (83) 98130-2961
- Instagram: @kitrunner_
