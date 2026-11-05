import { Transform } from 'class-transformer';

/** Remove espaços nas pontas de strings. */
export const Aparar = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Remove espaços e converte para minúsculas (e-mails e logins). */
export const NormalizarEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

/** Trata string vazia como campo não enviado, para que @IsOptional funcione com formulários. */
export const VazioParaUndefined = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const texto = value.trim();
    return texto === '' ? undefined : texto;
  });
