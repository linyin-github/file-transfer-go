
# 多平台全栈应用自动构建 Dockerfile
# 直接在镜像内完成前后端编译，适合 CI/CD 或无本地构建环境

FROM golang:1.21-bullseye AS builder

WORKDIR /workspace

# 拷贝全部源码
COPY . .

# 构建前端（Next.js SSG）
WORKDIR /workspace/chuan-next
RUN apt-get update && \
	apt-get install -y curl && \
	curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
	apt-get install -y nodejs && \
	corepack enable && \
	corepack prepare yarn@stable --activate && \
	yarn install --silent && \
	# 临时移除 API 目录
	if [ -d "src/app/api" ]; then mv src/app/api /tmp/next-api-backup; fi && \
	NEXT_EXPORT=true NODE_ENV=production NEXT_PUBLIC_BACKEND_URL= NEXT_PUBLIC_WS_URL= NEXT_PUBLIC_API_BASE_URL= yarn build && \
	# 恢复 API 目录
	if [ -d "/tmp/next-api-backup" ]; then mv /tmp/next-api-backup src/app/api; fi

# 拷贝前端静态文件到嵌入目录
WORKDIR /workspace
RUN rm -rf internal/web/frontend/* && \
	cp -r chuan-next/out/* internal/web/frontend/

# 构建后端（Go 二进制，嵌入前端文件）
RUN mkdir -p dist && \
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags "-s -w -extldflags '-static'" -o dist/file-transfer-server-linux-amd64 ./cmd

# 生产镜像
FROM debian:bullseye-slim
WORKDIR /app

# 拷贝编译好的二进制和前端资源
COPY --from=builder /workspace/dist/file-transfer-server-linux-amd64 /app/file-transfer-server
COPY --from=builder /workspace/internal/web/frontend /app/frontend

ENV PORT=8080
EXPOSE 8080
CMD ["/app/file-transfer-server"]
