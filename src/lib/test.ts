import { prisma } from "./prisma";
async function test() {
  try {
    const user = await prisma.user.create({ data: { email: "test2@test.com", password: "", name: "test", role: "VENDOR" }});
    console.log(user);
  } catch(e) {
    console.error(e);
  }
}
test();
