// Variáveis padrão para os testes (rodam antes de qualquer import do app).
// DATABASE_URL vem do docker-compose (serviço "tests" aponta para o db-test).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'segredo-de-teste-com-mais-de-32-caracteres!!';
process.env.JWT_EXPIRES_IN ??= '1h';
// Limite alto para os testes poderem logar várias vezes sem tomar 429
process.env.RATE_LIMIT_LOGIN = '1000';
