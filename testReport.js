const {
    generateDepartmentReport
} = require("./services/attendanceReportService");

async function test() {
    try {

        const result =
            await generateDepartmentReport(
                "CSD",
                "2026-09-23"
            );

        console.log("\nREPORT GENERATED\n");
        console.log(result);

    } catch (error) {

        console.error(error);

    } finally {

        process.exit();
    }
}

test();