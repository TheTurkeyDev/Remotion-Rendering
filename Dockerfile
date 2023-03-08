FROM alpine:3.17
ENV NODE_ENV=production
# Install necessary packages
RUN apk update
RUN apk add --no-cache chromium-swiftshader="109.0.5414.74-r0" ffmpeg="5.1.2-r1" nodejs-current="19.3.0-r0" git
# Add a user so Chrome can use the sandbox.
RUN addgroup -S remotion && adduser -S -g remotion remotion
RUN mkdir -p /output
RUN chown -R remotion:remotion /output
# Install the right package manager and dependencies - see below for Yarn/PNPM
RUN npm install --omit=dev

COPY output/. ./

# Run everything after as non-privileged user.
USER remotion

CMD [ "node", "rest.js" ]