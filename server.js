const { connect } = require("http2");
const inquirer = require("inquirer");
const mysql = require("mysql2");


// create a connection to sql
const SQLconnection = mysql.createConnection({
        host: "localhost",
        port: 3306,
        user: "root",
        password: "",
        database: "employee_tracker_db",
    });

    SQLconnection.connect((err) => {
        if (err) throw err;
        console.log('Successfully connected to database');

        start();
    });


    function start() {
        inquirer.prompt({
            type: "list",
            name: "Employee Tracker",
            messages: "Please make a selection",
            choices: [
                "View all Departments",
                "View all Employees",
                "View all Roles",
                "Add a deparment",
                "Add an employee",
                "Add a role",
                "Update an employee's role",
                "Exit",
            ],

        })

        .then((answer) => {
            switch(answer.action) {
                case "View all Departments":
                    viewAllDepartments();
                break;

                case "View all Employees":
                    viewAllEmployees();
                break;

                case "View all Roles":
                    viewAllRoles();
                break;

                case "Add a deparment":
                    addDepartment();
                break;

                case "Add a employee":
                    addEmployee();
                break;

                case "Add a role":
                    addRole();
                break;

                case "Update an employee's role":
                    updateEmployeeRole();
                break;

                case "Exit":
                    SQLconnection.end();
                    console.log("Have a great day!")
                break;
            }
        });
    }

    //funciton allows us to view all departments 
    function viewAllDepartments() {
        const query = "SELECT * FROM departments";
        SQLconnection.query(query, (err, res) => {
            if (err) throw err;
            console.table(res);
            // restart the application
            start();
        });
    }

    //funciton allows us to view all roles 
    function viewAllRoles() {
        const query = "SELECT roles.title, roles.id, departments.department_name, roles.salary"
        SQLconnection.query(query, (err, res) => {
            if (err) throw err;
            console.table(res);
            // restart the application
            start();
        });
    }


    //funciton to add departments 

    function addDepartment() {
        inquirer
        .prompt({
            type: "input",
            name:"name",
            message: "Enter the name of the department you would like to add",
        })
        .then((answer) => {
            console.log(answer.name)
            const query = `INSERT INTO departments (department_name) VALUES ("${answer.name}")`;
            SQLconnection.query(query, (err, res) => {
                if (err) throw err;
                console.log(`Successfully added department ${answer.name}!`);
                // restart the application
                start();
                console.log(answer.name);
            });

        });
    }

    //add the role and other information related to the role 

    function addRole () {
        const query = "SELECT * FROM departments";
        SQLconnection.query(query, (err, res) => {
            if (err) throw err;
            inquirer
                .prompt([
                    {
                        type:"input",
                        name: "title",
                        message: "Please enter the new role title",
                    },
                    {
                        type:"input",
                        name: "salary",
                        message: "Please enter the salary for the new role",
                    },

                    //choose which department from the other db of department names 
                    {
                        type:"input",
                        name: "department",
                        message: "Please choose a department for this role.",
                        choices: res.map(
                            (department) => department.department_name
                        ),
                    }
                ])
                .then((answers) => {
                    const department = res.find(
                        (department) => department.name === answers.department
                    );
                    const query = "INSERT INTO roles SET ?";
                    SQLconnection.query(
                        query,
                        {
                            title: answers.title,
                            salary: answers.salary,
                            department_id: department,
                        },
                        (err, res) => {
                            if (err) throw err;
                            console.log('Added ${answers.title} with salary ${answers.salary} to the ${answers.department} department in the database!');
                            start();
                        }
                    );


                });


        });
    }

    //function to add an employee
function addEmployee() {
    SQLconnection.query("SELECT id, title FROM roles", (error, results) => {
        if (error) {
            console.error(error);
            return;
        }

        const roles = results.map(({ id, title }) => ({
            name: title,
            value: id,
        }));

        // get list of employees from DB to use as a manager 
        SQLconnection.query(
            'SELECT id, CONCAT(first_name, " ", last_name) AS name FROM employee',
            (error, results) => {
                if (error) {
                    console.error(error);
                    return;
                }

                const managers = results.map(({ id, name }) => ({
                    name,
                    value: id,
                }));

                // ask the user to input employee info (prompt)
                inquirer
                    .prompt([
                        {
                            type: "input",
                            name: "firstName",
                            message: "What is the employee's first name?",
                        },
                        {
                            type: "input",
                            name: "lastName",
                            message: "What is the employee's last name?",
                        },
                        {
                            type: "list",
                            name: "roleId",
                            message: "Select the role:",
                            choices: roles,
                        },
                        {
                            type: "list",
                            name: "managerId",
                            message: "Select the manager:",
                            choices: [
                                { name: "None", value: null },
                                ...managers,
                            ],
                        },
                    ])
                    .then((answers) => {
                        // add the employee into the database
                        const sql =
                            "INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES (?, ?, ?, ?)";
                        const values = [
                            answers.firstName,
                            answers.lastName,
                            answers.roleId,
                            answers.managerId,
                        ];
                        SQLconnection.query(sql, values, (error) => {
                            if (error) {
                                console.error(error);
                                return;
                            }

                            console.log("Employee added successfully");
                            start();
                        });
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            }
        );
    });
}

// Function to add a Manager
function addManager() {
    const queryDepartments = "SELECT * FROM departments";
    const queryEmployees = "SELECT * FROM employee";

    SQLconnection.query(queryDepartments, (err, resDepartments) => {
        if (err) throw err;
        SQLconnection.query(queryEmployees, (err, resEmployees) => {
            if (err) throw err;
            inquirer
                .prompt([
                    {
                        type: "list",
                        name: "department",
                        message: "Select the department:",
                        choices: resDepartments.map(
                            (department) => department.department_name
                        ),
                    },
                    {
                        type: "list",
                        name: "employee",
                        message: "Select the employee to add a manager to:",
                        choices: resEmployees.map(
                            (employee) =>
                                `${employee.first_name} ${employee.last_name}`
                        ),
                    },
                    {
                        type: "list",
                        name: "manager",
                        message: "Select the employee's manager:",
                        choices: resEmployees.map(
                            (employee) =>
                                `${employee.first_name} ${employee.last_name}`
                        ),
                    },
                ])
                .then((answers) => {
                    const department = resDepartments.find(
                        (department) =>
                            department.department_name === answers.department
                    );
                    const employee = resEmployees.find(
                        (employee) =>
                            `${employee.first_name} ${employee.last_name}` ===
                            answers.employee
                    );
                    const manager = resEmployees.find(
                        (employee) =>
                            `${employee.first_name} ${employee.last_name}` ===
                            answers.manager
                    );
                    const query =
                        "UPDATE employee SET manager_id = ? WHERE id = ? AND role_id IN (SELECT id FROM roles WHERE department_id = ?)";
                    SQLconnection.query(
                        query,
                        [manager.id, employee.id, department.id],
                        (err, res) => {
                            if (err) throw err;
                            console.log(
                                `Added manager ${manager.first_name} ${manager.last_name} to employee ${employee.first_name} ${employee.last_name} in department ${department.department_name}!`
                            );
                            // restart the application
                            start();
                        }
                    );
                });
        });
    });
}

// function to update an employee role
function updateEmployeeRole() {
    const queryEmployees =
        "SELECT employee.id, employee.first_name, employee.last_name, roles.title FROM employee LEFT JOIN roles ON employee.role_id = roles.id";
    const queryRoles = "SELECT * FROM roles";
    SQLconnection.query(queryEmployees, (err, resEmployees) => {
        if (err) throw err;
        SQLconnection.query(queryRoles, (err, resRoles) => {
            if (err) throw err;
            inquirer
                .prompt([
                    {
                        type: "list",
                        name: "employee",
                        message: "Select the employee:",
                        choices: resEmployees.map(
                            (employee) =>
                                `${employee.first_name} ${employee.last_name}`
                        ),
                    },
                    {
                        type: "list",
                        name: "role",
                        message: "Select the role:",
                        choices: resRoles.map((role) => role.title),
                    },
                ])
                .then((answers) => {
                    const employee = resEmployees.find(
                        (employee) =>
                            `${employee.first_name} ${employee.last_name}` ===
                            answers.employee
                    );
                    const role = resRoles.find(
                        (role) => role.title === answers.role
                    );
                    const query =
                        "UPDATE employee SET role_id = ? WHERE id = ?";
                    SQLconnection.query(
                        query,
                        [role.id, employee.id],
                        (err, res) => {
                            if (err) throw err;
                            console.log(
                                `Updated ${employee.first_name} ${employee.last_name}'s role to ${role.title} in the database!`
                            );
                            // restart the application
                            start();
                        }
                    );
                });
        });
    });
}

// quit the program
process.on("exit", () => {
    SQLconnection.end();
});