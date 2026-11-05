import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';

/**
 * Padroniza as respostas de erro com o campo `mensagem`, que é o que o frontend lê.
 * Erros de validação (lista de mensagens) viram um texto só.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const resposta = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const corpo = exception.getResponse();

    let mensagem: string;
    if (typeof corpo === 'string') {
      mensagem = corpo;
    } else {
      const { mensagem: m1, message: m2 } = corpo as { mensagem?: unknown; message?: unknown };
      const bruto = m1 ?? m2 ?? exception.message;
      mensagem = Array.isArray(bruto) ? bruto.join('; ') : String(bruto);
    }

    resposta.status(status).json({ statusCode: status, mensagem });
  }
}
