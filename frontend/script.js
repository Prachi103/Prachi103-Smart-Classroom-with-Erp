const apiUrl = "http://localhost:5000/api";

// ======================
// NAVIGATION FUNCTIONS
// ======================
document.getElementById("homeLink").addEventListener("click", (e) => {
  e.preventDefault();
  showSection("home");
});

document.getElementById("loginLink").addEventListener("click", (e) => {
  e.preventDefault();
  showSection("login");
  resetLoginForms();
});

document.getElementById("getStarted").addEventListener("click", (e) => {
  e.preventDefault();
  showSection("login");
  document.getElementById("studentLoginBtn").click();
});

function showSection(id) {
  document.querySelectorAll(".section").forEach(sec => {
    sec.classList.add("hidden");
    sec.style.display = "none";
  });
  const section = document.getElementById(id);
  section.classList.remove("hidden");
  section.style.display = "block";
}

// ======================
// LOGIN FORM HANDLING
// ======================
document.getElementById("userLoginBtn").addEventListener("click", (e) => {
  e.preventDefault();
  toggleLoginForms('user');
});

document.getElementById("studentLoginBtn").addEventListener("click", (e) => {
  e.preventDefault();
  toggleLoginForms('student');
});

function toggleLoginForms(activeForm) {
  const userForm = document.getElementById("userLoginForm");
  const studentForm = document.getElementById("studentLoginForm");

  userForm.classList.toggle("hidden", activeForm !== 'user');
  studentForm.classList.toggle("hidden", activeForm !== 'student');
}

function resetLoginForms() {
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("rollNo").value = "";
  document.getElementById("studentPassword").value = "";
  document.getElementById("user-error-message").textContent = "";
  document.getElementById("student-error-message").textContent = "";
}

// ======================
// USER LOGIN (Plain Password)
// ======================
document.getElementById("userLoginFormEl").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorElement = document.getElementById("user-error-message");

  if (!username || !password) {
    errorElement.textContent = "Please enter both username and password";
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/users`);
    if (!res.ok) throw new Error("Failed to fetch users");

    const users = await res.json();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      localStorage.setItem("loggedInUser", JSON.stringify({ ...user, role: "user" }));
      showUserDashboard(user);
    } else {
      errorElement.textContent = "Invalid username or password";
    }
  } catch (err) {
    console.error("User login error:", err);
    errorElement.textContent = "Server error, please try again later";
  }
});

// ======================
// STUDENT LOGIN (Plain Password)
// ======================
document.getElementById("studentLoginFormEl").addEventListener("submit", async (e) => {
  e.preventDefault();
  const rollNo = document.getElementById("rollNo").value.trim().toUpperCase();
  const password = document.getElementById("studentPassword").value.trim();
  const errorElement = document.getElementById("student-error-message");

  if (!rollNo || !password) {
    errorElement.textContent = "Please enter both roll number and password";
    return;
  }

  try {
    const response = await fetch(`${apiUrl}/students/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollNo, password })
    });

    const data = await response.json();

    if (!response.ok) {
      errorElement.textContent = data.error || "Login failed. Please check your credentials.";
      return;
    }

    const studentData = {
      ...data.student,
      role: "student",
      remainingFees: data.student.totalFees - data.student.feesPaid
    };

    localStorage.setItem("loggedInUser", JSON.stringify(studentData));
    showStudentDashboard(studentData);

  } catch (error) {
    console.error("Student login error:", error);
    errorElement.textContent = "Server error, please try again later";
  }
});

// ======================
// STUDENT DASHBOARD FUNCTIONS
// ======================
function showStudentDashboard(student) {
  showSection("studentDashboard");
  document.getElementById("student-name").textContent = student.name;
  
  // Store current student globally
  window.currentStudent = student;
  
  // Load student info by default
  loadStudentInfo();
  
  // Update all fee-related displays
  updateFeeDisplays(student);
}

// Load student info section
function loadStudentInfo() {
  const student = JSON.parse(localStorage.getItem("loggedInUser"));
  document.getElementById("studentContent").innerHTML = `
    <div class="student-info-section">
      <h3>Student Information</h3>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Roll No:</span>
          <span class="info-value">${student.rollNo}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Course:</span>
          <span class="info-value">${student.course}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Duration:</span>
          <span class="info-value">${student.duration} years</span>
        </div>
        <div class="info-item">
          <span class="info-label">Total Fees:</span>
          <span class="info-value">₹${student.totalFees}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Fees Paid:</span>
          <span class="info-value">₹${student.feesPaid}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Remaining Fees:</span>
          <span class="info-value">₹${student.totalFees - student.feesPaid}</span>
        </div>
      </div>
    </div>
  `;
}

// Fees section
document.getElementById("feesOption").addEventListener("click", () => {
  const student = JSON.parse(localStorage.getItem("loggedInUser"));
  document.getElementById("studentContent").innerHTML = `
    <div class="payment-section">
      <h3>Fee Payment</h3>
      <div class="payment-details">
        <p><strong>Student Name:</strong> ${student.name}</p>
        <p><strong>Roll No:</strong> ${student.rollNo}</p>
        <p><strong>Total Fees:</strong> ₹${student.totalFees}</p>
        <p><strong>Fees Paid:</strong> ₹${student.feesPaid}</p>
        <p><strong>Remaining Fees:</strong> ₹${student.totalFees - student.feesPaid}</p>
      </div>
      <button id="payFeesBtn" class="btn">Pay Fees</button>
    </div>
  `;
  
  document.getElementById("payFeesBtn").addEventListener("click", async () => {
    const paymentAmount = student.totalFees - student.feesPaid;
    if (paymentAmount <= 0) {
      alert("No pending fees to pay!");
      return;
    }
    
    try {
      // Show loading state
      const payBtn = document.getElementById("payFeesBtn");
      payBtn.textContent = "Processing...";
      payBtn.disabled = true;
      
      // Create Razorpay order
      const orderResponse = await fetch(`${apiUrl}/razorpay/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          rollNo: student.rollNo,
          amount: paymentAmount
        })
      });

      const orderData = await orderResponse.json();
      
      if (!orderResponse.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // Initialize Razorpay payment
      const options = {
        key: 'rzp_test_Ratlhmks8SmIok',
        amount: orderData.amount,
        currency: "INR",
        name: "College Fee Payment",
        description: `Fee Payment for ${student.name}`,
        order_id: orderData.id,
        handler: async function(response) {
          try {
            // Verify payment
            const verifyResponse = await fetch(`${apiUrl}/razorpay/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                rollNo: student.rollNo,
                amount: paymentAmount
              })
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok && verifyData.success) {
              // Update local storage with new values
              const updatedStudent = {
                ...verifyData.student,
                role: "student"
              };
              localStorage.setItem("loggedInUser", JSON.stringify(updatedStudent));

              // Show success message
              alert("✅ Payment successful!");
              
              // Refresh the entire dashboard
              showStudentDashboard(updatedStudent);
            } else {
              alert(verifyData.error || "Payment verification failed");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            alert("Failed to verify payment. Please contact support.");
          } finally {
            // Reset button state
            payBtn.textContent = "Pay Fees";
            payBtn.disabled = false;
          }
        },
        prefill: {
          name: student.name,
        },
        theme: {
          color: "#3399cc"
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to process payment. Please try again.");
      // Reset button state
      const payBtn = document.getElementById("payFeesBtn");
      payBtn.textContent = "Pay Fees";
      payBtn.disabled = false;
    }
  });
});

// Assignment section
document.getElementById("assignmentOption").addEventListener("click", () => {
  document.getElementById("studentContent").innerHTML = `
    <div class="assignment-section">
      <h3>Assignments</h3>
      <div class="assignment-tabs">
        <button class="tab-btn active" data-tab="available">Available Assignments</button>
        <button class="tab-btn" data-tab="submitted">My Submissions</button>
      </div>
      
      <div id="availableAssignments" class="tab-content active">
        <h4>Available Assignments</h4>
        <div id="assignmentsList"></div>
      </div>
      
      <div id="submittedAssignments" class="tab-content">
        <h4>My Submitted Assignments</h4>
        <div id="mySubmissionsList"></div>
      </div>
    </div>
  `;
  
  // Load assignments
  loadAvailableAssignments();
  loadMySubmissions();
  
  // Add event listeners for tabs
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all tabs
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab
      button.classList.add('active');
      document.getElementById(`${button.dataset.tab}Assignments`).classList.add('active');
    });
  });
});

// Load available assignments
function loadAvailableAssignments() {
  const assignments = JSON.parse(localStorage.getItem("assignments")) || [];
  const currentStudent = JSON.parse(localStorage.getItem("loggedInUser"));
  
  // Filter active assignments
  const activeAssignments = assignments.filter(a => a.status === 'active');
  
  const assignmentsListElement = document.getElementById("assignmentsList");
  
  if (activeAssignments.length === 0) {
    assignmentsListElement.innerHTML = "<p>No assignments available at the moment.</p>";
    return;
  }
  
  let html = '<div class="assignments-grid">';
  
  activeAssignments.forEach(assignment => {
    // Check if student has already submitted this assignment
    const hasSubmitted = assignment.submissions && 
      assignment.submissions.some(s => s.rollNo === currentStudent.rollNo);
    
    html += `
      <div class="assignment-card">
        <h4>${assignment.title}</h4>
        <p><strong>Teacher:</strong> ${assignment.teacherName}</p>
        <p><strong>Due Date:</strong> ${assignment.dueDate}</p>
        <p>${assignment.description.substring(0, 100)}${assignment.description.length > 100 ? '...' : ''}</p>
        ${assignment.fileName ? `<p><a href="${assignment.fileData}" download="${assignment.fileName}">Download Assignment</a></p>` : ''}
        <button class="btn ${hasSubmitted ? 'submitted-btn' : ''}" 
                data-id="${assignment.id}" 
                ${hasSubmitted ? 'disabled' : ''}>
          ${hasSubmitted ? 'Already Submitted' : 'Submit Assignment'}
        </button>
      </div>
    `;
  });
  
  html += '</div>';
  assignmentsListElement.innerHTML = html;
  
  // Add event listeners for submit buttons
  document.querySelectorAll('.assignment-card .btn:not(.submitted-btn)').forEach(button => {
    button.addEventListener('click', () => showAssignmentSubmissionForm(button.dataset.id));
  });
}

// Show assignment submission form
function showAssignmentSubmissionForm(assignmentId) {
  const assignments = JSON.parse(localStorage.getItem("assignments")) || [];
  const assignment = assignments.find(a => a.id === assignmentId);
  
  if (!assignment) {
    alert("Assignment not found");
    return;
  }
  
  document.getElementById("studentContent").innerHTML = `
    <div class="assignment-submission-form">
      <h3>Submit Assignment: ${assignment.title}</h3>
      <button class="btn back-to-assignments">Back to Assignments</button>
      
      <div class="assignment-details">
        <p><strong>Description:</strong> ${assignment.description}</p>
        <p><strong>Due Date:</strong> ${assignment.dueDate}</p>
        ${assignment.fileName ? `<p><strong>Assignment File:</strong> <a href="${assignment.fileData}" download="${assignment.fileName}">${assignment.fileName}</a></p>` : ''}
      </div>
      
      <form id="assignmentSubmissionForm">
        <div class="form-group">
          <label for="submissionFile">Upload Your Assignment (PDF, DOC, DOCX):</label>
          <input type="file" id="submissionFile" accept=".pdf,.doc,.docx" required>
        </div>
        <div class="form-group">
          <label for="submissionNotes">Notes (optional):</label>
          <textarea id="submissionNotes" rows="3"></textarea>
        </div>
        <button type="submit" class="btn">Submit Assignment</button>
      </form>
    </div>
  `;
  
  // Add event listener for back button
  document.querySelector('.back-to-assignments').addEventListener('click', () => {
    document.getElementById("assignmentOption").click();
  });
  
  // Add event listener for form submission
  document.getElementById("assignmentSubmissionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById("submissionFile");
    const notes = document.getElementById("submissionNotes").value;
    const currentStudent = JSON.parse(localStorage.getItem("loggedInUser"));
    
    if (fileInput.files.length === 0) {
      alert("Please select a file to submit");
      return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
      // Create submission object
      const submission = {
        id: Date.now().toString(),
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        rollNo: currentStudent.rollNo,
        fileName: file.name,
        fileData: event.target.result,
        submissionDate: new Date().toISOString().split('T')[0],
        notes: notes
      };
      
      // Add submission to assignment
      if (!assignment.submissions) {
        assignment.submissions = [];
      }
      
      assignment.submissions.push(submission);
      
      // Save updated assignments
      localStorage.setItem("assignments", JSON.stringify(assignments));
      
      // Show success message and go back to assignments
      alert("Assignment submitted successfully!");
      document.getElementById("assignmentOption").click();
    };
    
    reader.readAsDataURL(file);
  });
}

// Load my submissions
function loadMySubmissions() {
  const assignments = JSON.parse(localStorage.getItem("assignments")) || [];
  const currentStudent = JSON.parse(localStorage.getItem("loggedInUser"));
  
  // Find all submissions by current student
  const mySubmissions = [];
  
  assignments.forEach(assignment => {
    if (assignment.submissions) {
      const studentSubmission = assignment.submissions.find(s => s.rollNo === currentStudent.rollNo);
      
      if (studentSubmission) {
        mySubmissions.push({
          ...studentSubmission,
          assignmentTitle: assignment.title,
          assignmentId: assignment.id,
          teacherName: assignment.teacherName
        });
      }
    }
  });
  
  const submissionsListElement = document.getElementById("mySubmissionsList");
  
  if (mySubmissions.length === 0) {
    submissionsListElement.innerHTML = "<p>You haven't submitted any assignments yet.</p>";
    return;
  }
  
  let html = '<table class="submissions-table">';
  html += `
    <thead>
      <tr>
        <th>Assignment</th>
        <th>Teacher</th>
        <th>Submission Date</th>
        <th>Grade</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
  `;
  
  mySubmissions.forEach(submission => {
    html += `
      <tr>
        <td>${submission.assignmentTitle}</td>
        <td>${submission.teacherName}</td>
        <td>${submission.submissionDate}</td>
        <td>${submission.grade || 'Not graded yet'}</td>
        <td>
          <button class="btn-small view-submission-details" data-assignment-id="${submission.assignmentId}" data-submission-id="${submission.id}">View Details</button>
        </td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  submissionsListElement.innerHTML = html;
  
  // Add event listeners for view details buttons
  document.querySelectorAll('.view-submission-details').forEach(button => {
    button.addEventListener('click', () => viewSubmissionDetails(button.dataset.assignmentId, button.dataset.submissionId));
  });
}

// View submission details
function viewSubmissionDetails(assignmentId, submissionId) {
  const assignments = JSON.parse(localStorage.getItem("assignments")) || [];
  const assignment = assignments.find(a => a.id === assignmentId);
  
  if (!assignment) {
    alert("Assignment not found");
    return;
  }
  
  const submission = assignment.submissions.find(s => s.id === submissionId);
  
  if (!submission) {
    alert("Submission not found");
    return;
  }
  
  document.getElementById("studentContent").innerHTML = `
    <div class="submission-details-view">
      <h3>Submission Details</h3>
      <button class="btn back-to-submissions">Back to My Submissions</button>
      
      <div class="submission-info">
        <h4>${assignment.title}</h4>
        <p><strong>Teacher:</strong> ${assignment.teacherName}</p>
        <p><strong>Submission Date:</strong> ${submission.submissionDate}</p>
        ${submission.notes ? `<p><strong>Notes:</strong> ${submission.notes}</p>` : ''}
        <p><strong>Submitted File:</strong> <a href="${submission.fileData}" download="${submission.fileName}">${submission.fileName}</a></p>
      </div>
      
      <div class="grade-info">
        <h4>Grade Information</h4>
        ${submission.grade ? `
          <p><strong>Grade:</strong> ${submission.grade}/100</p>
          <p><strong>Graded Date:</strong> ${submission.gradedDate}</p>
          ${submission.feedback ? `<p><strong>Feedback:</strong> ${submission.feedback}</p>` : ''}
        ` : '<p>Your submission has not been graded yet.</p>'}
      </div>
    </div>
  `;
  
  // Add event listener for back button
  document.querySelector('.back-to-submissions').addEventListener('click', () => {
    document.getElementById("assignmentOption").click();
    // Switch to submitted tab
    document.querySelector('[data-tab="submitted"]').click();
  });
}

// ======================
// USER/TEACHER DASHBOARD FUNCTIONS
// ======================
function showUserDashboard(user) {
  showSection("userDashboard");
  document.getElementById("user-name-display").textContent = user.name;
  
  // Load user info
  document.getElementById("userInfoContent").innerHTML = `
    <div class="user-details">
      <div class="detail-item">
        <span class="detail-label">Username:</span>
        <span class="detail-value">${user.username}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Email:</span>
        <span class="detail-value">${user.email || 'Not provided'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Role:</span>
        <span class="detail-value">${user.role === 'teacher' ? 'Teacher' : 'Administrator'}</span>
      </div>
    </div>
  `;
}

// Publish Assignment
document.getElementById("publishAssignment").addEventListener("click", () => {
  document.getElementById("userInfoContent").innerHTML = `
    <div class="publish-assignment">
      <h3>Publish New Assignment</h3>
      <form id="assignmentPublishForm">
        <input type="text" id="assignmentTitle" placeholder="Assignment Title" required>
        <textarea id="assignmentDescription" placeholder="Description" required></textarea>
        <input type="date" id="assignmentDueDate" required>
        <div class="file-upload-container">
          <label for="assignmentFile">Upload Assignment (PDF):</label>
          <input type="file" id="assignmentFile" accept=".pdf">
        </div>
        <button type="submit" class="btn">Publish Assignment</button>
      </form>
      <div id="assignmentPublishStatus"></div>
      
      <div class="published-assignments">
        <h3>Published Assignments</h3>
        <div id="publishedAssignmentsList"></div>
      </div>
    </div>
  `;
  
  // Load published assignments
  loadPublishedAssignments();
  
  // Add event listener for form submission
  document.getElementById("assignmentPublishForm").addEventListener("submit", handleAssignmentPublish);
});

// Handle assignment publishing
function handleAssignmentPublish(e) {
  e.preventDefault();
  
  const title = document.getElementById("assignmentTitle").value;
  const description = document.getElementById("assignmentDescription").value;
  const dueDate = document.getElementById("assignmentDueDate").value;
  const fileInput = document.getElementById("assignmentFile");
  
  // Get current user
  const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
  
  // Create assignment object
  const assignment = {
    id: Date.now().toString(),
    title,
    description,
    dueDate,
    teacherId: currentUser.id,
    teacherName: currentUser.name,
    publishDate: new Date().toISOString().split('T')[0],
    status: 'active',
    submissions: []
  };
  
  // Handle file upload if present
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
      assignment.fileData = event.target.result;
      assignment.fileName = file.name;
      saveAssignment(assignment);
    };
    
    reader.readAsDataURL(file);
  } else {
    // Save assignment without file
    saveAssignment(assignment);
  }
}

// Save assignment to localStorage
function saveAssignment(assignment) {
  // Get existing assignments
  const assignments = JSON.parse(localStorage.getItem("assignments")) || [];
  
  // Add new assignment
  assignments.push(assignment);
  
  // Save back to localStorage
  localStorage.setItem("assignments", JSON.stringify(assignments));
  
  // Update UI
  document.getElementById("assignmentPublishStatus").innerHTML = `
    <div class="success-message">
      <p>Assignment "${assignment.title}" published successfully!</p>
    </div>
  `;
  
  // Reset form
  document.getElementById("assignmentPublishForm").reset();
  
  // Reload assignments list
  loadPublishedAssignments();
}

// Load published assignments
function loadPublishedAssignments() {
  const assignments = JSON.parse(localStorage.getItem("assignments")) || [];
  const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
  
  // Filter assignments by current teacher
  const teacherAssignments = assignments.filter(a => a.teacherId === currentUser.id);
  
  const assignmentsListElement = document.getElementById("publishedAssignmentsList");
  
  if (teacherAssignments.length === 0) {
    assignmentsListElement.innerHTML = "<p>No assignments published yet.</p>";
    return;
  }
  
  let html = '<table class="assignments-table">';
  html += `
    <thead>
      <tr>
        <th>Title</th>
        <th>Due Date</th>
        <th>Submissions</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
  `;
  
  teacherAssignments.forEach(assignment => {
    html += `
      <tr>
        <td>${assignment.title}</td>
        <td>${assignment.dueDate}</td>
        <td>${assignment.submissions ? assignment.submissions.length : 0}</td>
        <td>
          <button class="btn-small view-submissions" data-id="${assignment.id}">View Submissions</button>
          <button class="btn-small delete-assignment" data-id="${assignment.id}">Delete</button>
        </td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  assignmentsListElement.innerHTML = html;
  
  // Add event listeners for buttons
  document.querySelectorAll('.view-submissions').forEach(button => {
    button.addEventListener('click', () => viewAssignmentSubmissions(button.dataset.id));
  });
  
  document.querySelectorAll('.delete-assignment').forEach(button => {
    button.addEventListener('click', () => deleteAssignment(button.dataset.id));
  });
}

// View assignment submissions
function viewAssignmentSubmissions(assignmentId) {
  const assignments = JSON.parse(localStorage.getItem("assignments")) || [];
  const assignment = assignments.find(a => a.id === assignmentId);
  
  if (!assignment) {
    alert("Assignment not found");
    return;
  }
  
  document.getElementById("userInfoContent").innerHTML = `
    <div class="submissions-view">
      <h3>Submissions for "${assignment.title}"</h3>
      <button class="btn back-to-assignments">Back to Assignments</button>
      
      <div class="assignment-details">
        <p><strong>Description:</strong> ${assignment.description}</p>
        <p><strong>Due Date:</strong> ${assignment.dueDate}</p>
        ${assignment.fileName ? `<p><strong>Assignment File:</strong> <a href="${assignment.fileData}" download="${assignment.fileName}">${assignment.fileName}</a></p>` : ''}
      </div>
      
      <div class="submissions-list">
        <h4>Student Submissions</h4>
        ${renderSubmissionsList(assignment)}
      </div>
    </div>
  `;
  
  // Add event listener for back button
  document.querySelector('.back-to-assignments').addEventListener('click', () => {
    document.getElementById("publishAssignment").click();
  });
}

// Render submissions list
function renderSubmissionsList(assignment) {
  if (!assignment.submissions || assignment.submissions.length === 0) {
    return "<p>No submissions yet.</p>";
  }
  
  let html = '<table class="submissions-table">';
  html += `
    <thead>
      <tr>
        <th>Student Name</th>
        <th>Roll No</th>
        <th>Submission Date</th>
        <th>File</th>
        <th>Grade</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
  `;
  
  assignment.submissions.forEach(submission => {
    html += `
      <tr>
        <td>${submission.studentName}</td>
        <td>${submission.rollNo}</td>
        <td>${submission.submissionDate}</td>
        <td><a href="${submission.fileData}" download="${submission.fileName}">${submission.fileName}</a></td>
        <td>${submission.grade || 'Not graded'}</td>
        <td>
          <button class="btn-small grade-submission" data-assignment-id="${assignment.id}" data-submission-id="${submission.id}">Grade</button>
        </td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  return html;
}

// Delete assignment
function deleteAssignment(assignmentId) {
  if (!confirm("Are you sure you want to delete this assignment?")) {
    return;
  }
  
  const assignments = JSON.parse(localStorage.getItem("assignments")) || [];
  const updatedAssignments = assignments.filter(a => a.id !== assignmentId);
  
  localStorage.setItem("assignments", JSON.stringify(updatedAssignments));
  
  // Reload assignments list
  loadPublishedAssignments();
  
  // Show success message
  document.getElementById("assignmentPublishStatus").innerHTML = `
    <div class="success-message">
      <p>Assignment deleted successfully!</p>
    </div>
  `;
}

// Grade submission
function gradeSubmission(assignmentId, submissionId) {
  const assignments = JSON.parse(localStorage.getItem("assignments")) || [];
  const assignment = assignments.find(a => a.id === assignmentId);
  
  if (!assignment) {
    alert("Assignment not found");
    return;
  }
  
  const submission = assignment.submissions.find(s => s.id === submissionId);
  
  if (!submission) {
    alert("Submission not found");
    return;
  }
  
  document.getElementById("userInfoContent").innerHTML = `
    <div class="grade-submission-form">
      <h3>Grade Submission</h3>
      <p><strong>Student:</strong> ${submission.studentName} (${submission.rollNo})</p>
      <p><strong>Assignment:</strong> ${assignment.title}</p>
      <p><strong>Submission Date:</strong> ${submission.submissionDate}</p>
      
      <form id="gradeSubmissionForm">
        <div class="form-group">
          <label for="grade">Grade (out of 100):</label>
          <input type="number" id="grade" min="0" max="100" value="${submission.grade || ''}" required>
        </div>
        <div class="form-group">
          <label for="feedback">Feedback:</label>
          <textarea id="feedback" rows="4">${submission.feedback || ''}</textarea>
        </div>
        <button type="submit" class="btn">Submit Grade</button>
        <button type="button" class="btn back-to-submissions">Back to Submissions</button>
      </form>
    </div>
  `;
  
  // Add event listeners
  document.getElementById("gradeSubmissionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    
    const grade = document.getElementById("grade").value;
    const feedback = document.getElementById("feedback").value;
    
    // Update submission with grade and feedback
    submission.grade = grade;
    submission.feedback = feedback;
    submission.gradedDate = new Date().toISOString().split('T')[0];
    
    // Save updated assignments
    localStorage.setItem("assignments", JSON.stringify(assignments));
    
    // Go back to submissions view
    viewAssignmentSubmissions(assignmentId);
  });
  
  document.querySelector(".back-to-submissions").addEventListener("click", () => {
    viewAssignmentSubmissions(assignmentId);
  });
}

// Add event listener for grade submission buttons
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('grade-submission')) {
    const assignmentId = e.target.dataset.assignmentId;
    const submissionId = e.target.dataset.submissionId;
    gradeSubmission(assignmentId, submissionId);
  }
});

// View All Attendance
document.getElementById("viewAllAttendance").addEventListener("click", () => {
  const attendanceData = JSON.parse(localStorage.getItem("attendanceData")) || [];
  
  let html = '<div class="attendance-section"><h3>All Attendance Records</h3>';
  
  if (attendanceData.length === 0) {
    html += '<p>No attendance records found</p>';
  } else {
    html += `
      <table class="attendance-table">
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${attendanceData.map(record => `
            <tr>
              <td>${record.studentId}</td>
              <td>${record.studentName}</td>
              <td>${record.date}</td>
              <td>${record.time}</td>
              <td>${record.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  html += '</div>';
  document.getElementById("userInfoContent").innerHTML = html;
});

// ======================
// FACE RECOGNITION SYSTEM
// ======================
let faceDetectionInterval;

async function initFaceRecognition() {
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    return true;
  } catch (error) {
    console.error("Error loading face models:", error);
    throw error;
  }
}

async function startFaceDetection() {
  const video = document.getElementById('videoElement');
  const statusElement = document.getElementById('attendanceStatus');
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    statusElement.textContent = "Camera started. Please face the camera...";
    
    // Start detection loop
    faceDetectionInterval = setInterval(async () => {
      await detectFaces();
    }, 500);
    
  } catch (err) {
    console.error("Camera error:", err);
    statusElement.textContent = "Could not access camera";
  }
}

async function detectFaces() {
  const video = document.getElementById('videoElement');
  const canvas = document.getElementById('canvasElement');
  const statusElement = document.getElementById('attendanceStatus');
  
  if (!video.videoWidth) return;
  
  // Set canvas size
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Detect faces
  const detections = await faceapi.detectAllFaces(video, 
    new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();
  
  // Clear canvas
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw detections
  faceapi.draw.drawDetections(canvas, detections);
  faceapi.draw.drawFaceLandmarks(canvas, detections);
  
  // Process detections
  if (detections.length > 0) {
    const student = JSON.parse(localStorage.getItem('loggedInUser'));
    if (student) {
      // Load registered faces from localStorage
      const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || {};
      
      if (!registeredFaces[student.rollNo]) {
        // Register new face
        registeredFaces[student.rollNo] = detections[0].descriptor;
        localStorage.setItem('registeredFaces', JSON.stringify(registeredFaces));
        statusElement.textContent = "Face registered successfully!";
        markAttendance(student);
      } else {
        // Recognize existing face
        const faceMatcher = new faceapi.FaceMatcher([
          new faceapi.LabeledFaceDescriptors(
            student.rollNo, 
            [registeredFaces[student.rollNo]]
          )
        ]);
        
        const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
        if (bestMatch.label === student.rollNo && bestMatch.distance < 0.5) {
          statusElement.textContent = "Attendance marked successfully!";
          markAttendance(student);
        } else {
          statusElement.textContent = "Face not recognized. Please try again.";
        }
      }
    }
  }
}

function markAttendance(student) {
  // Stop detection
  clearInterval(faceDetectionInterval);
  const video = document.getElementById('videoElement');
  
  // Get current date and time
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString();
  
  // Create attendance record
  const attendanceRecord = {
    studentId: student.rollNo,
    studentName: student.name,
    date: dateStr,
    time: timeStr,
    status: 'Present'
  };
  
  // Save to localStorage
  let attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || [];
  attendanceData.push(attendanceRecord);
  localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
  
  // Stop video stream
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }
  
  // Show success message
  document.getElementById('attendanceStatus').innerHTML = `
    <div class="attendance-status">
      <h4>Attendance Marked Successfully!</h4>
      <p>Student: ${student.name}</p>
      <p>Roll No: ${student.rollNo}</p>
      <p>Date: ${dateStr}</p>
      <p>Time: ${timeStr}</p>
    </div>
  `;
}

// ======================
// QR CODE HANDLING
// ======================
async function loadStudentQR(rollNo) {
  const qrImg = document.getElementById('upiQR');
  const qrDetails = document.getElementById('qrDetails');

  try {
    const qrRes = await fetch(`${apiUrl}/payment/qr/${rollNo}`);
    if (!qrRes.ok) throw new Error("Failed to load QR data");

    const qrData = await qrRes.json();

    if (qrData.qrDataUrl) {
      qrImg.src = qrData.qrDataUrl;
      qrImg.style.display = "block";
      qrDetails.innerHTML = `
        <p><strong>Payable Amount:</strong> ₹${qrData.remainingFees}</p>
        <p><strong>Pay to:</strong> ${qrData.student?.name || "College Account"}</p>
        <button id="simulatePaymentBtn" class="pay-btn">Simulate Payment</button>
      `;

      // Handle payment simulation
      document.getElementById("simulatePaymentBtn").addEventListener("click", async () => {
        const paymentAmount = Number(qrData.remainingFees);
        if (!paymentAmount || isNaN(paymentAmount)) {
          alert("Invalid payment amount.");
          return;
        }
        
        try {
          // Show loading state
          const simulateBtn = document.getElementById("simulatePaymentBtn");
          simulateBtn.textContent = "Processing...";
          simulateBtn.disabled = true;
          
          // Create Razorpay order
          const orderResponse = await fetch(`${apiUrl}/razorpay/create-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              rollNo: rollNo,
              amount: paymentAmount
            })
          });

          const orderData = await orderResponse.json();
          
          if (!orderResponse.ok) {
            throw new Error(orderData.error || "Failed to create order");
          }

          // Initialize Razorpay payment
          const options = {
            key: 'rzp_test_Ratlhmks8SmIok',
            amount: orderData.amount,
            currency: "INR",
            name: "College Fee Payment",
            description: `Fee Payment for ${qrData.student?.name || "Student"}`,
            order_id: orderData.id,
            handler: async function(response) {
              try {
                // Verify payment
                const verifyResponse = await fetch(`${apiUrl}/razorpay/verify-payment`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    rollNo: rollNo,
                    amount: paymentAmount
                  })
                });

                const verifyData = await verifyResponse.json();

                if (verifyResponse.ok && verifyData.success) {
                  // Update local storage with new values
                  const updatedStudent = {
                    ...verifyData.student,
                    role: "student"
                  };
                  localStorage.setItem("loggedInUser", JSON.stringify(updatedStudent));

                  // Show success message
                  alert("✅ Payment successful!");
                  
                  // Refresh the entire dashboard
                  showStudentDashboard(updatedStudent);
                  
                  // Reload QR section with updated data
                  setTimeout(() => {
                    loadStudentQR(rollNo);
                  }, 500);
                } else {
                  alert(verifyData.error || "Payment verification failed");
                }
              } catch (error) {
                console.error("Payment verification error:", error);
                alert("Failed to verify payment. Please contact support.");
              } finally {
                // Reset button state
                simulateBtn.textContent = "Pay Now";
                simulateBtn.disabled = false;
              }
            },
            prefill: {
              name: qrData.student?.name || "",
            },
            theme: {
              color: "#3399cc"
            }
          };

          const rzp = new Razorpay(options);
          rzp.open();

        } catch (error) {
          console.error("Payment error:", error);
          alert("Failed to process payment. Please try again.");
          // Reset button state
          const simulateBtn = document.getElementById("simulatePaymentBtn");
          simulateBtn.textContent = "Pay Now";
          simulateBtn.disabled = false;
        }
      });
    } else {
      qrImg.style.display = "none";
      qrDetails.innerHTML = `<p class="error">${qrData.message || "No fees pending"}</p>`;
    }
  } catch (error) {
    console.error("QR Load Error:", error);
    qrImg.style.display = "none";
    qrDetails.innerHTML = '<p class="error">Failed to load payment QR</p>';
  }
}


// ======================
// LOGOUT FUNCTION
// ======================
document.getElementById("logout").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("loggedInUser");
  showSection("login");
  resetLoginForms();
});

document.getElementById("logoutUser").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("loggedInUser");
  showSection("login");
  resetLoginForms();
});

// ======================
// INITIAL LOAD
// ======================
window.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (user) {
    if (user.role === "student") {
      showStudentDashboard(user);
    } else {
      showUserDashboard(user);
    }
  } else {
    showSection("home");
  }

  resetLoginForms();
});

// Attendance section
document.getElementById("attendanceOption").addEventListener("click", () => {
  document.getElementById("studentContent").innerHTML = `
    <div class="face-attendance-container">
      <h3>Face Recognition Attendance</h3>
      <p>Click below to mark your attendance using face recognition</p>
      <button id="startFaceRecognition" class="btn">Start Face Recognition</button>
      <div class="video-container hidden" id="videoContainer">
        <video id="videoElement" width="400" height="300" autoplay muted></video>
        <canvas id="canvasElement"></canvas>
      </div>
      <div id="attendanceStatus"></div>
    </div>
  `;
  
  document.getElementById("startFaceRecognition").addEventListener("click", async () => {
    const videoContainer = document.getElementById("videoContainer");
    videoContainer.classList.remove("hidden");
    
    try {
      await initFaceRecognition();
      startFaceDetection();
    } catch (error) {
      document.getElementById("attendanceStatus").textContent = "Error initializing face recognition";
      console.error(error);
    }
  });
});

// View Attendance section
document.getElementById("viewAttendance").addEventListener("click", () => {
  const student = JSON.parse(localStorage.getItem("loggedInUser"));
  const attendanceData = JSON.parse(localStorage.getItem("attendanceData")) || [];
  const studentAttendance = attendanceData.filter(record => record.studentId === student.rollNo);
  
  let html = '<div class="attendance-section"><h3>Your Attendance Records</h3>';
  
  if (studentAttendance.length === 0) {
    html += '<p>No attendance records found</p>';
  } else {
    html += `
      <table class="attendance-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${studentAttendance.map(record => `
            <tr>
              <td>${record.date}</td>
              <td>${record.time}</td>
              <td>${record.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  html += '</div>';
  document.getElementById("studentContent").innerHTML = html;
});

// ======================
// TIMETABLE MANAGEMENT
// ======================
// Teacher's timetable management
document.getElementById("manageTimetable").addEventListener("click", () => {
  document.getElementById("userInfoContent").innerHTML = `
    <div class="timetable-management">
      <h3>Manage Class Timetable</h3>
      
      <div class="current-timetable">
        <h4>Current Timetable</h4>
        <div id="currentTimetableDisplay"></div>
      </div>
      
      <div class="timetable-upload">
        <h4>Upload New Timetable</h4>
        <form id="timetableUploadForm">
          <div class="form-group">
            <label for="timetableTitle">Timetable Title:</label>
            <input type="text" id="timetableTitle" placeholder="e.g., Semester 1 Timetable" required>
          </div>
          
          <div class="form-group">
            <label for="timetableDescription">Description (optional):</label>
            <textarea id="timetableDescription" rows="3"></textarea>
          </div>
          
          <div class="form-group">
            <label for="timetableFile">Upload Timetable File:</label>
            <div class="file-options">
              <div class="file-option">
                <input type="radio" id="textFormat" name="fileFormat" value="text" checked>
                <label for="textFormat">Text Format</label>
              </div>
              <div class="file-option">
                <input type="radio" id="pdfFormat" name="fileFormat" value="pdf">
                <label for="pdfFormat">PDF Format</label>
              </div>
              <div class="file-option">
                <input type="radio" id="imageFormat" name="fileFormat" value="image">
                <label for="imageFormat">Image Format</label>
              </div>
            </div>
            <input type="file" id="timetableFile" required>
            <div id="fileFormatHint" class="hint-text">Accepted formats: .txt</div>
          </div>
          
          <button type="submit" class="btn">Upload Timetable</button>
        </form>
      </div>
      
      <div id="timetableUploadStatus"></div>
    </div>
  `;
  
  // Load current timetable
  loadCurrentTimetable();
  
  // Add event listeners for file format selection
  document.querySelectorAll('input[name="fileFormat"]').forEach(radio => {
    radio.addEventListener('change', updateFileInput);
  });
  
  // Add event listener for form submission
  document.getElementById("timetableUploadForm").addEventListener("submit", handleTimetableUpload);
});

// Update file input based on selected format
function updateFileInput() {
  const fileFormat = document.querySelector('input[name="fileFormat"]:checked').value;
  const fileInput = document.getElementById("timetableFile");
  const fileHint = document.getElementById("fileFormatHint");
  
  switch(fileFormat) {
    case 'text':
      fileInput.accept = ".txt";
      fileHint.textContent = "Accepted formats: .txt";
      break;
    case 'pdf':
      fileInput.accept = ".pdf";
      fileHint.textContent = "Accepted formats: .pdf";
      break;
    case 'image':
      fileInput.accept = ".jpg,.jpeg,.png,.gif";
      fileHint.textContent = "Accepted formats: .jpg, .jpeg, .png, .gif";
      break;
  }
}

// Handle timetable upload
function handleTimetableUpload(e) {
  e.preventDefault();
  
  const title = document.getElementById("timetableTitle").value;
  const description = document.getElementById("timetableDescription").value;
  const fileFormat = document.querySelector('input[name="fileFormat"]:checked').value;
  const fileInput = document.getElementById("timetableFile");
  
  if (fileInput.files.length === 0) {
    alert("Please select a file to upload");
    return;
  }
  
  const file = fileInput.files[0];
  const reader = new FileReader();
  
  reader.onload = function(event) {
    // Create timetable object
    const timetable = {
      id: Date.now().toString(),
      title,
      description,
      format: fileFormat,
      fileName: file.name,
      fileData: event.target.result,
      uploadDate: new Date().toISOString().split('T')[0],
      teacherId: JSON.parse(localStorage.getItem("loggedInUser")).id,
      teacherName: JSON.parse(localStorage.getItem("loggedInUser")).name
    };
    
    // Save timetable
    saveTimetable(timetable);
  };
  
  reader.readAsDataURL(file);
}

// Save timetable to localStorage
function saveTimetable(timetable) {
  // Get existing timetables
  const timetables = JSON.parse(localStorage.getItem("timetables")) || [];
  
  // Add new timetable
  timetables.push(timetable);
  
  // Save back to localStorage
  localStorage.setItem("timetables", JSON.stringify(timetables));
  
  // Update UI
  document.getElementById("timetableUploadStatus").innerHTML = `
    <div class="success-message">
      <p>Timetable "${timetable.title}" uploaded successfully!</p>
    </div>
  `;
  
  // Reset form
  document.getElementById("timetableUploadForm").reset();
  
  // Reload timetable display
  loadCurrentTimetable();
}

// Load current timetable
function loadCurrentTimetable() {
  const timetables = JSON.parse(localStorage.getItem("timetables")) || [];
  const currentUser = JSON.parse(localStorage.getItem("loggedInUser"));
  
  // Filter timetables by current teacher
  const teacherTimetables = timetables.filter(t => t.teacherId === currentUser.id);
  
  const timetableDisplayElement = document.getElementById("currentTimetableDisplay");
  
  if (teacherTimetables.length === 0) {
    timetableDisplayElement.innerHTML = "<p>No timetables uploaded yet.</p>";
    return;
  }
  
  // Sort timetables by upload date (newest first)
  teacherTimetables.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  
  let html = '<div class="timetable-list">';
  
  teacherTimetables.forEach(timetable => {
    html += `
      <div class="timetable-item">
        <div class="timetable-info">
          <h5>${timetable.title}</h5>
          <p>${timetable.description || 'No description'}</p>
          <p><strong>Format:</strong> ${timetable.format.toUpperCase()}</p>
          <p><strong>Uploaded:</strong> ${timetable.uploadDate}</p>
        </div>
        <div class="timetable-actions">
          <button class="btn-small view-timetable" data-id="${timetable.id}">View</button>
          <button class="btn-small delete-timetable" data-id="${timetable.id}">Delete</button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  timetableDisplayElement.innerHTML = html;
  
  // Add event listeners for buttons
  document.querySelectorAll('.view-timetable').forEach(button => {
    button.addEventListener('click', () => viewTimetable(button.dataset.id));
  });
  
  document.querySelectorAll('.delete-timetable').forEach(button => {
    button.addEventListener('click', () => deleteTimetable(button.dataset.id));
  });
}

// View timetable
function viewTimetable(timetableId) {
  const timetables = JSON.parse(localStorage.getItem("timetables")) || [];
  const timetable = timetables.find(t => t.id === timetableId);
  
  if (!timetable) {
    alert("Timetable not found");
    return;
  }
  
  document.getElementById("userInfoContent").innerHTML = `
    <div class="timetable-view">
      <h3>${timetable.title}</h3>
      <button class="btn back-to-timetables">Back to Timetables</button>
      
      <div class="timetable-details">
        <p><strong>Description:</strong> ${timetable.description || 'No description'}</p>
        <p><strong>Format:</strong> ${timetable.format.toUpperCase()}</p>
        <p><strong>Uploaded:</strong> ${timetable.uploadDate}</p>
        <p><strong>Teacher:</strong> ${timetable.teacherName}</p>
      </div>
      
      <div class="timetable-content">
        <h4>Timetable Content</h4>
        ${renderTimetableContent(timetable)}
      </div>
    </div>
  `;
  
  // Add event listener for back button
  document.querySelector('.back-to-timetables').addEventListener('click', () => {
    document.getElementById("manageTimetable").click();
  });
}

// Render timetable content based on format
function renderTimetableContent(timetable) {
  switch(timetable.format) {
    case 'text':
      return `<pre class="text-timetable">${timetable.fileData}</pre>`;
    case 'pdf':
    case 'image':
      return `<img src="${timetable.fileData}" alt="${timetable.title}" class="file-timetable">`;
    default:
      return `<p>Unsupported format</p>`;
  }
}

// Delete timetable
function deleteTimetable(timetableId) {
  if (!confirm("Are you sure you want to delete this timetable?")) {
    return;
  }
  
  const timetables = JSON.parse(localStorage.getItem("timetables")) || [];
  const updatedTimetables = timetables.filter(t => t.id !== timetableId);
  
  localStorage.setItem("timetables", JSON.stringify(updatedTimetables));
  
  // Reload timetable display
  loadCurrentTimetable();
  
  // Show success message
  document.getElementById("timetableUploadStatus").innerHTML = `
    <div class="success-message">
      <p>Timetable deleted successfully!</p>
    </div>
  `;
}

// Student's timetable viewing
document.getElementById("viewTimetable").addEventListener("click", () => {
  document.getElementById("studentContent").innerHTML = `
    <div class="timetable-view-section">
      <h3>Class Timetable</h3>
      <div id="studentTimetableDisplay"></div>
    </div>
  `;
  
  // Load timetables for student
  loadStudentTimetables();
});

// Load timetables for student
function loadStudentTimetables() {
  const timetables = JSON.parse(localStorage.getItem("timetables")) || [];
  const timetableDisplayElement = document.getElementById("studentTimetableDisplay");
  
  if (timetables.length === 0) {
    timetableDisplayElement.innerHTML = "<p>No timetables available at the moment.</p>";
    return;
  }
  
  // Sort timetables by upload date (newest first)
  timetables.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  
  let html = '<div class="timetable-list">';
  
  timetables.forEach(timetable => {
    html += `
      <div class="timetable-item">
        <div class="timetable-info">
          <h5>${timetable.title}</h5>
          <p>${timetable.description || 'No description'}</p>
          <p><strong>Teacher:</strong> ${timetable.teacherName}</p>
          <p><strong>Uploaded:</strong> ${timetable.uploadDate}</p>
        </div>
        <div class="timetable-actions">
          <button class="btn-small view-timetable-student" data-id="${timetable.id}">View Timetable</button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  timetableDisplayElement.innerHTML = html;
  
  // Add event listeners for view buttons
  document.querySelectorAll('.view-timetable-student').forEach(button => {
    button.addEventListener('click', () => viewTimetableForStudent(button.dataset.id));
  });
}

// View timetable for student
function viewTimetableForStudent(timetableId) {
  const timetables = JSON.parse(localStorage.getItem("timetables")) || [];
  const timetable = timetables.find(t => t.id === timetableId);
  
  if (!timetable) {
    alert("Timetable not found");
    return;
  }
  
  document.getElementById("studentContent").innerHTML = `
    <div class="timetable-view">
      <h3>${timetable.title}</h3>
      <button class="btn back-to-timetables-student">Back to Timetables</button>
      
      <div class="timetable-details">
        <p><strong>Description:</strong> ${timetable.description || 'No description'}</p>
        <p><strong>Teacher:</strong> ${timetable.teacherName}</p>
        <p><strong>Uploaded:</strong> ${timetable.uploadDate}</p>
      </div>
      
      <div class="timetable-content">
        <h4>Timetable Content</h4>
        ${renderTimetableContent(timetable)}
      </div>
    </div>
  `;
  
  // Add event listener for back button
  document.querySelector('.back-to-timetables-student').addEventListener('click', () => {
    document.getElementById("viewTimetable").click();
  });
}





// ======================
// ATTENDANCE KEY SYSTEM
// ======================
let activeAttendanceKey = null;
let keyExpirationTimer = null;

// Teacher: Generate attendance key
function generateAttendanceKey() {
  document.getElementById("userInfoContent").innerHTML = `
    <div class="attendance-key-section">
      <h3>Take Attendance</h3>
      <div class="key-generation">
        <button id="generateKeyBtn" class="btn">Generate Attendance Key</button>
        <div id="keyDisplay" class="hidden">
          <p>Share this key with your students:</p>
          <div class="key-box">${activeAttendanceKey}</div>
          <p class="key-timer">Valid for: <span id="keyTimeRemaining">30</span> seconds</p>
        </div>
      </div>
      
      <div class="recent-attendance">
        <h4>Recent Attendance Records</h4>
        <div id="recentAttendanceList"></div>
      </div>
    </div>
  `;

  document.getElementById("generateKeyBtn").addEventListener("click", () => {
    // Generate a random 6-digit key
    activeAttendanceKey = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Display the key
    const keyDisplay = document.getElementById("keyDisplay");
    keyDisplay.classList.remove("hidden");
    
    // Start countdown
    let timeLeft = 30;
    document.getElementById("keyTimeRemaining").textContent = timeLeft;
    
    // Clear any existing timer
    if (keyExpirationTimer) clearInterval(keyExpirationTimer);
    
    keyExpirationTimer = setInterval(() => {
      timeLeft--;
      document.getElementById("keyTimeRemaining").textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(keyExpirationTimer);
        activeAttendanceKey = null;
        keyDisplay.classList.add("hidden");
        document.getElementById("generateKeyBtn").disabled = false;
      }
    }, 1000);
    
    document.getElementById("generateKeyBtn").disabled = true;
    setTimeout(() => {
      document.getElementById("generateKeyBtn").disabled = false;
    }, 30000);
  });

  loadRecentAttendance();
}

// Student: Enter attendance key
function showAttendanceKeyInput() {
  document.getElementById("studentContent").innerHTML = `
    <div class="attendance-key-section">
      <h3>Mark Attendance</h3>
      <p>Enter the attendance key provided by your teacher:</p>
      <input type="text" id="attendanceKeyInput" placeholder="Enter 6-digit key" maxlength="6">
      <button id="submitAttendanceKey" class="btn">Submit</button>
      <div id="attendanceKeyStatus"></div>
    </div>
  `;

  document.getElementById("submitAttendanceKey").addEventListener("click", () => {
    const enteredKey = document.getElementById("attendanceKeyInput").value.trim();
    const statusElement = document.getElementById("attendanceKeyStatus");
    
    if (!enteredKey || enteredKey.length !== 6) {
      statusElement.innerHTML = '<p class="error">Please enter a valid 6-digit key</p>';
      return;
    }
    
    if (!activeAttendanceKey) {
      statusElement.innerHTML = '<p class="error">No active attendance session found</p>';
      return;
    }
    
    if (enteredKey === activeAttendanceKey) {
      const student = JSON.parse(localStorage.getItem("loggedInUser"));
      markAttendance(student);
      statusElement.innerHTML = '<p class="success">Attendance marked successfully!</p>';
    } else {
      statusElement.innerHTML = '<p class="error">Invalid key. Please try again.</p>';
    }
  });
}

// Mark attendance (common function for both methods)
function markAttendance(student) {
  // Get current date and time
  const now = new Date();
  const dateStr = now.toLocaleDateString();
  const timeStr = now.toLocaleTimeString();
  
  // Create attendance record
  const attendanceRecord = {
    studentId: student.rollNo,
    studentName: student.name,
    date: dateStr,
    time: timeStr,
    status: 'Present',
    method: 'Key Verification'
  };
  
  // Save to localStorage
  let attendanceData = JSON.parse(localStorage.getItem('attendanceData')) || [];
  attendanceData.push(attendanceRecord);
  localStorage.setItem('attendanceData', JSON.stringify(attendanceData));
  
  // Show success message
  if (document.getElementById('attendanceKeyStatus')) {
    document.getElementById('attendanceKeyStatus').innerHTML = `
      <div class="attendance-status">
        <h4>Attendance Marked Successfully!</h4>
        <p>Student: ${student.name}</p>
        <p>Roll No: ${student.rollNo}</p>
        <p>Date: ${dateStr}</p>
        <p>Time: ${timeStr}</p>
      </div>
    `;
  }
}

// Load recent attendance records
function loadRecentAttendance() {
  const attendanceData = JSON.parse(localStorage.getItem("attendanceData")) || [];
  const recentRecords = attendanceData.slice(-5).reverse(); // Get last 5 records
  
  const listElement = document.getElementById("recentAttendanceList");
  
  if (recentRecords.length === 0) {
    listElement.innerHTML = "<p>No recent attendance records</p>";
    return;
  }
  
  let html = '<table class="attendance-table">';
  html += `
    <thead>
      <tr>
        <th>Student</th>
        <th>Roll No</th>
        <th>Date</th>
        <th>Time</th>
        <th>Method</th>
      </tr>
    </thead>
    <tbody>
  `;
  
  recentRecords.forEach(record => {
    html += `
      <tr>
        <td>${record.studentName}</td>
        <td>${record.studentId}</td>
        <td>${record.date}</td>
        <td>${record.time}</td>
        <td>${record.method || 'N/A'}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  listElement.innerHTML = html;
}

// ======================
// UPDATE EVENT LISTENERS
// ======================

// Add this to your existing event listeners
document.getElementById("takeAttendance").addEventListener("click", generateAttendanceKey);

// Update the attendance option for students
document.getElementById("attendanceOption").addEventListener("click", showAttendanceKeyInput);







// ======================
// LECTURE SCHEDULE SYSTEM
// ======================
const subjects = ["Mathematics", "Computer Science", "Physics"];
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Initialize schedule if not exists
if (!localStorage.getItem("lectureSchedule")) {
  const defaultSchedule = [
    { day: "Monday", time: "09:00", subject: "Mathematics", duration: 60 },
    { day: "Tuesday", time: "10:00", subject: "Computer Science", duration: 60 },
    { day: "Wednesday", time: "11:00", subject: "Physics", duration: 60 },
    { day: "Thursday", time: "09:00", subject: "Mathematics", duration: 60 },
    { day: "Friday", time: "10:00", subject: "Computer Science", duration: 60 }
  ];
  localStorage.setItem("lectureSchedule", JSON.stringify(defaultSchedule));
}

// Initialize active keys if not exists
if (!localStorage.getItem("attendanceKeys")) {
  localStorage.setItem("attendanceKeys", JSON.stringify([]));
}

// ======================
// TEACHER FUNCTIONS
// ======================

// Manage lecture schedule
function showScheduleManagement() {
  const schedule = JSON.parse(localStorage.getItem("lectureSchedule")) || [];
  
  let html = `
    <div class="schedule-management">
      <h3>Manage Lecture Schedule</h3>
      <button id="addLectureBtn" class="btn">Add New Lecture</button>
      
      <div class="current-schedule">
        <h4>Current Schedule</h4>
        <table class="schedule-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Time</th>
              <th>Subject</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="scheduleList">
  `;

  schedule.forEach((lecture, index) => {
    html += `
      <tr>
        <td>${lecture.day}</td>
        <td>${lecture.time}</td>
        <td>${lecture.subject}</td>
        <td>${lecture.duration} mins</td>
        <td>
          <button class="btn-small delete-lecture" data-index="${index}">Delete</button>
        </td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("userInfoContent").innerHTML = html;

  // Add event listeners
  document.getElementById("addLectureBtn").addEventListener("click", showAddLectureForm);
  document.querySelectorAll(".delete-lecture").forEach(btn => {
    btn.addEventListener("click", () => deleteLecture(btn.dataset.index));
  });
}

function showAddLectureForm() {
  document.getElementById("userInfoContent").innerHTML = `
    <div class="add-lecture-form">
      <h3>Add New Lecture</h3>
      <form id="lectureForm">
        <div class="form-group">
          <label for="lectureDay">Day:</label>
          <select id="lectureDay" required>
            ${daysOfWeek.map(day => `<option value="${day}">${day}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="lectureTime">Start Time:</label>
          <input type="time" id="lectureTime" required>
        </div>
        <div class="form-group">
          <label for="lectureSubject">Subject:</label>
          <select id="lectureSubject" required>
            ${subjects.map(sub => `<option value="${sub}">${sub}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="lectureDuration">Duration (minutes):</label>
          <input type="number" id="lectureDuration" value="60" min="30" max="120" required>
        </div>
        <button type="submit" class="btn">Save Lecture</button>
        <button type="button" id="cancelAddLecture" class="btn">Cancel</button>
      </form>
    </div>
  `;

  document.getElementById("lectureForm").addEventListener("submit", saveLecture);
  document.getElementById("cancelAddLecture").addEventListener("click", showScheduleManagement);
}

function saveLecture(e) {
  e.preventDefault();
  
  const schedule = JSON.parse(localStorage.getItem("lectureSchedule")) || [];
  
  const newLecture = {
    day: document.getElementById("lectureDay").value,
    time: document.getElementById("lectureTime").value,
    subject: document.getElementById("lectureSubject").value,
    duration: parseInt(document.getElementById("lectureDuration").value)
  };
  
  schedule.push(newLecture);
  localStorage.setItem("lectureSchedule", JSON.stringify(schedule));
  
  showScheduleManagement();
}

function deleteLecture(index) {
  const schedule = JSON.parse(localStorage.getItem("lectureSchedule")) || [];
  schedule.splice(index, 1);
  localStorage.setItem("lectureSchedule", JSON.stringify(schedule));
  showScheduleManagement();
}

// Take attendance
function showTakeAttendance() {
  const schedule = JSON.parse(localStorage.getItem("lectureSchedule")) || [];
  const now = new Date();
  const currentDay = daysOfWeek[now.getDay() - 1]; // Adjust for JS getDay()
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                     now.getMinutes().toString().padStart(2, '0');

  // Find lectures happening today
  const todaysLectures = schedule.filter(lecture => lecture.day === currentDay);
  
  let html = `
    <div class="take-attendance">
      <h3>Take Attendance</h3>
      
      <div class="lecture-selection">
        <h4>Select Current Lecture</h4>
        <div class="lecture-options">
  `;

  if (todaysLectures.length === 0) {
    html += `<p>No lectures scheduled for today.</p>`;
  } else {
    todaysLectures.forEach(lecture => {
      const startTime = lecture.time;
      const [hours, mins] = startTime.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(hours);
      endTime.setMinutes(mins + lecture.duration);
      
      const endTimeStr = endTime.getHours().toString().padStart(2, '0') + ':' + 
                        endTime.getMinutes().toString().padStart(2, '0');
      
      // Check if current time is within lecture time
      const isActive = currentTime >= startTime && currentTime <= endTimeStr;
      
      html += `
        <div class="lecture-option ${isActive ? 'active-lecture' : ''}">
          <h5>${lecture.subject}</h5>
          <p>${startTime} - ${endTimeStr}</p>
          <button class="btn generate-key-btn" 
                  data-subject="${lecture.subject}"
                  ${!isActive ? 'disabled' : ''}>
            Generate Key
          </button>
        </div>
      `;
    });
  }

  html += `
        </div>
      </div>
      
      <div class="key-generation hidden" id="keyGenerationSection">
        <h4>Attendance Key</h4>
        <div class="key-display">
          <span id="attendanceKey"></span>
          <span id="keyTimer"></span>
        </div>
        <div class="key-controls">
          <label for="keyDuration">Valid for (minutes):</label>
          <input type="number" id="keyDuration" min="1" max="15" value="5">
          <button id="startKeyTimer" class="btn">Start Timer</button>
        </div>
      </div>
      
      <div class="recent-attendance">
        <h4>Recent Attendance</h4>
        <div id="recentAttendanceList"></div>
      </div>
    </div>
  `;

  document.getElementById("userInfoContent").innerHTML = html;

  // Add event listeners
  document.querySelectorAll(".generate-key-btn").forEach(btn => {
    btn.addEventListener("click", () => showKeyGeneration(btn.dataset.subject));
  });

  loadRecentAttendance();
}

function showKeyGeneration(subject) {
  document.getElementById("keyGenerationSection").classList.remove("hidden");
  const key = Math.floor(1000 + Math.random() * 9000); // 4-digit key
  document.getElementById("attendanceKey").textContent = key;
  
  // Store the active key
  const activeKey = {
    key: key.toString(),
    subject: subject,
    generatedAt: new Date().toISOString(),
    expiresAt: null, // Will be set when timer starts
    valid: false
  };
  
  // Save to localStorage
  let keys = JSON.parse(localStorage.getItem("attendanceKeys")) || [];
  keys = keys.filter(k => !k.valid); // Remove any old valid keys
  keys.push(activeKey);
  localStorage.setItem("attendanceKeys", JSON.stringify(keys));
  
  // Enable duration setting
  document.getElementById("startKeyTimer").addEventListener("click", () => {
    const duration = parseInt(document.getElementById("keyDuration").value) || 5;
    startKeyTimer(key, duration, subject);
  });
}

function startKeyTimer(key, duration, subject) {
  const keys = JSON.parse(localStorage.getItem("attendanceKeys")) || [];
  const keyIndex = keys.findIndex(k => k.key === key.toString());
  
  if (keyIndex === -1) return;
  
  const now = new Date();
  const expiresAt = new Date(now.getTime() + duration * 60000);
  
  keys[keyIndex].expiresAt = expiresAt.toISOString();
  keys[keyIndex].valid = true;
  localStorage.setItem("attendanceKeys", JSON.stringify(keys));
  
  // Start countdown
  const timerElement = document.getElementById("keyTimer");
  let timeLeft = duration * 60; // in seconds
  
  const timer = setInterval(() => {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerElement.textContent = `(Valid for ${minutes}m ${seconds}s)`;
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      keys[keyIndex].valid = false;
      localStorage.setItem("attendanceKeys", JSON.stringify(keys));
      timerElement.textContent = "(Expired)";
    }
  }, 1000);
}

// ======================
// STUDENT FUNCTIONS
// ======================

function showMarkAttendance() {
  const now = new Date();
  const currentDay = daysOfWeek[now.getDay() - 1];
  const schedule = JSON.parse(localStorage.getItem("lectureSchedule")) || [];
  
  // Find current or upcoming lectures
  const todaysLectures = schedule.filter(lecture => lecture.day === currentDay);
  
  let html = `
    <div class="mark-attendance">
      <h3>Mark Attendance</h3>
      
      <div class="lecture-info">
        <h4>Current Lectures</h4>
  `;

  if (todaysLectures.length === 0) {
    html += `<p>No lectures scheduled for today.</p>`;
  } else {
    todaysLectures.forEach(lecture => {
      const [hours, mins] = lecture.time.split(':').map(Number);
      const startTime = new Date();
      startTime.setHours(hours);
      startTime.setMinutes(mins);
      
      const endTime = new Date(startTime.getTime() + lecture.duration * 60000);
      
      const now = new Date();
      const isActive = now >= startTime && now <= endTime;
      
      html += `
        <div class="lecture-card ${isActive ? 'active' : ''}">
          <h5>${lecture.subject}</h5>
          <p>${lecture.time} - ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}</p>
          ${isActive ? `
            <div class="attendance-form">
              <input type="text" id="attendanceKeyInput" placeholder="Enter 4-digit key">
              <button class="btn submit-key" data-subject="${lecture.subject}">Submit</button>
            </div>
            <div id="attendanceStatus"></div>
          ` : ''}
        </div>
      `;
    });
  }

  html += `
      </div>
    </div>
  `;

  document.getElementById("studentContent").innerHTML = html;

  // Add event listeners
  document.querySelectorAll(".submit-key").forEach(btn => {
    btn.addEventListener("click", () => verifyAttendanceKey(btn.dataset.subject));
  });
}

function verifyAttendanceKey(subject) {
  const enteredKey = document.getElementById("attendanceKeyInput").value.trim();
  const statusElement = document.getElementById("attendanceStatus");
  
  if (!enteredKey || enteredKey.length !== 4 || !/^\d+$/.test(enteredKey)) {
    statusElement.innerHTML = '<p class="error">Please enter a valid 4-digit key</p>';
    return;
  }
  
  const keys = JSON.parse(localStorage.getItem("attendanceKeys")) || [];
  const now = new Date();
  
  const validKey = keys.find(k => 
    k.key === enteredKey && 
    k.subject === subject &&
    k.valid &&
    new Date(k.expiresAt) > now
  );
  
  if (validKey) {
    const student = JSON.parse(localStorage.getItem("loggedInUser"));
    markAttendance(student, subject, enteredKey);
    statusElement.innerHTML = `
      <div class="success">
        <p>Attendance marked for ${subject}!</p>
        <p>Key: ${enteredKey}</p>
        <p>Time: ${now.toLocaleTimeString()}</p>
      </div>
    `;
  } else {
    statusElement.innerHTML = '<p class="error">Invalid key or key expired</p>';
  }
}

function markAttendance(student, subject, key) {
  const now = new Date();
  const attendanceRecord = {
    studentId: student.rollNo,
    studentName: student.name,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    subject: subject,
    keyUsed: key,
    status: 'Present'
  };
  
  let attendanceData = JSON.parse(localStorage.getItem("attendanceData")) || [];
  attendanceData.push(attendanceRecord);
  localStorage.setItem("attendanceData", JSON.stringify(attendanceData));
}

// ======================
// HELPER FUNCTIONS
// ======================

function loadRecentAttendance() {
  const attendanceData = JSON.parse(localStorage.getItem("attendanceData")) || [];
  const recentRecords = attendanceData.slice(-10).reverse();
  
  let html = '<table class="attendance-table">';
  html += `
    <thead>
      <tr>
        <th>Student</th>
        <th>Subject</th>
        <th>Date</th>
        <th>Time</th>
        <th>Key</th>
      </tr>
    </thead>
    <tbody>
  `;
  
  recentRecords.forEach(record => {
    html += `
      <tr>
        <td>${record.studentName}</td>
        <td>${record.subject}</td>
        <td>${record.date}</td>
        <td>${record.time}</td>
        <td>${record.keyUsed}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  
  const container = document.getElementById("recentAttendanceList");
  if (container) {
    container.innerHTML = html;
  }
}

// ======================
// EVENT LISTENERS
// ======================

document.getElementById("manageSchedule").addEventListener("click", showScheduleManagement);
document.getElementById("takeAttendance").addEventListener("click", showTakeAttendance);
document.getElementById("markAttendance").addEventListener("click", showMarkAttendance);

// Initialize
window.addEventListener("DOMContentLoaded", () => {
  // ... existing initialization code ...
  loadRecentAttendance();
});