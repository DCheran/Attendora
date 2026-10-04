const cron = require("node-cron");
const attendanceReportService = require("./attendanceReportService");

/*
 * Generate and email department reports every day.
 *
 * Runs at 3:30 PM Monday-Saturday.
 */
const startDailyReportScheduler = () => {

    cron.schedule(
        "30 15 * * 1-6",
        async () => {

            console.log(
                "========================================"
            );

            console.log(
                "Starting daily attendance report generation..."
            );

            console.log(
                "========================================"
            );

            const departments = [
                "CSE",
                "CSD",
                "ECE",
                "EEE",
                "CSM",
                "IT",
                "Mech"
            ];

            for (const department of departments) {

                try {

                    console.log(
                        `Generating report for ${department}...`
                    );

                    /*
                     * Use today's date.
                     */
                    const attendanceDate = new Date().toLocaleDateString("en-CA", {
                        timeZone: "Asia/Kolkata",
                    });

                    /*
                     * Generate report.
                     */
                    const result =
                        await attendanceReportService.generateDepartmentReport(
                            department,
                            attendanceDate
                        );

                    console.log(
                        `${department} report completed:`,
                        result.fileName
                    );

                } catch (error) {

                    console.error(
                        `Failed to generate ${department} report:`,
                        error.message
                    );
                }
            }

            console.log(
                "Daily attendance report process completed."
            );
        },
        {
            timezone: "Asia/Kolkata"
        }
    );

    console.log(
        "Daily attendance report scheduler started."
    );

    console.log(
        "Reports will be processed at 3:30 PM, Monday-Saturday."
    );
};

module.exports = {
    startDailyReportScheduler
};