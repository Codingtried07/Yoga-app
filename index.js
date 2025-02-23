// Global state variables
let yogaPosesData = null;

// Load yoga poses data when the page loads
async function loadYogaPosesData() {
    try {
        const response = await fetch('yoga-api.json');
        yogaPosesData = await response.json();
        console.log('Yoga poses data loaded successfully');
    } catch (error) {
        console.error('Error loading yoga poses data:', error);
    }
}

// Initialize data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadYogaPosesData();
    initializeEventListeners();
});

function initializeEventListeners() {
    // Initialize pose detection button
    const capturePoseBtn = document.getElementById('capturePose');
    if (capturePoseBtn) {
        capturePoseBtn.addEventListener('click', () => {
            window.open('pose_detector.html', '_blank');
        });
    }

    // Initialize recommendation button
    const recommendBtn = document.querySelector('button');
    if (recommendBtn) {
        recommendBtn.addEventListener('click', getYogaRecommendations);
    }
}

async function getYogaRecommendations() {
    const healthCondition = document.getElementById('healthCondition').value;
    if (!healthCondition.trim()) {
        alert('Please describe your health conditions');
        return;
    }

    // Show loading state 
    const button = document.querySelector('button');
    const buttonText = document.getElementById('buttonText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    button.disabled = true;
    buttonText.textContent = 'Creating Your Personalized Plan...';
    loadingSpinner.classList.remove('hidden');

    try {
        if (!yogaPosesData) {
            // Reload data if not available
            await loadYogaPosesData();
        }

        if (!yogaPosesData) {
            throw new Error('Unable to load yoga poses data');
        }

        // Filter out empty poses and select relevant poses based on health conditions
        const validPoses = yogaPosesData.filter(pose =>
            pose.english_name &&
            pose.procedure.length > 0 &&
            pose.benefits.length > 0 &&
            pose.contraindications.length > 0
        );

        // Create an array of relevant health conditions and target areas
        const userConditions = healthCondition.toLowerCase()
            .split(/[,.\s]+/) // Split on commas, periods, or whitespace
            .filter(word => word.length > 3); // Filter out short words

        // Score each pose based on relevance to user's conditions
        const scoredPoses = validPoses.map(pose => {
            let score = 0;
            const poseText = [
                pose.english_name.toLowerCase(),
                ...pose.benefits.map(b => b.toLowerCase()),
                ...pose.target_body_parts.map(t => t.toLowerCase()),
                pose.sanskrit_name.toLowerCase()
            ].join(' ');

            // Check each user condition against pose text
            userConditions.forEach(condition => {
                if (poseText.includes(condition)) {
                    score += 1;
                }
            });

            // Add bonus points for poses with more complete information
            score += (pose.benefits.length / 10); // Slight bonus for number of benefits
            score += (pose.procedure.length / 10); // Slight bonus for detailed procedure

            return { pose, score };
        });

        // Sort poses by score and get top 3
        const recommendedPoses = scoredPoses
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(item => item.pose);

        // Format the poses for display
        const formattedResponse = recommendedPoses.map((pose, index) => `
            ${index + 1}. ${pose.english_name} (${pose.sanskrit_name})
            
            Benefits: ${pose.benefits.join(', ')}
            
            Steps: ${pose.procedure.join('\n')}
            
            Precautions: ${pose.contraindications.join(', ')}
            
            Duration: Hold the pose for 30-60 seconds while maintaining steady breathing.
        `).join('\n\n');

        // Parse and display recommendations
        const recommendations = parseAIResponse(formattedResponse);
        displayRecommendations(recommendations);

        // Show recommendations section
        document.getElementById('recommendations').classList.remove('hidden');

        // Smooth scroll to recommendations
        document.getElementById('recommendations').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while generating recommendations. Please try again.');
    } finally {
        // Reset button state
        button.disabled = false;
        buttonText.textContent = 'Get Personalized Yoga Plan';
        loadingSpinner.classList.add('hidden');
    }
}

function parseAIResponse(response) {
    // Split response into pose sections
    const poses = response.split(/\d+\./).filter(pose => pose.trim());
    return poses.map(pose => {
        const lines = pose.split('\n').filter(line => line.trim());
        const poseName = lines[0].trim();
        return {
            name: poseName,
            details: formatYogaDetails(pose)
        };
    });
}

function formatYogaDetails(poseText) {
    const sections = poseText.split('\n').filter(line => line.trim());

    return sections.map(section => {
        // Handle empty sections
        if (!section || !section.trim()) return '';

        // Format different sections with appropriate styling
        if (section.toLowerCase().includes('benefits:')) {
            const benefits = section.split(':')[1] || '';
            return `<div class="mt-3">
                <strong class="text-teal-700">✨ Benefits:</strong>
                <span class="ml-2">${benefits}</span>
            </div>`;
        }
        else if (section.toLowerCase().includes('steps:')) {
            const steps = section.split(':')[1] || '';
            return `<div class="mt-3">
                <strong class="text-teal-700">📝 Steps:</strong>
                <span class="ml-2">${steps}</span>
            </div>`;
        }
        else if (section.toLowerCase().includes('precautions:')) {
            const precautions = section.split(':')[1] || '';
            return `<div class="mt-3">
                <strong class="text-teal-700">⚠️ Precautions:</strong>
                <span class="ml-2">${precautions}</span>
            </div>`;
        }
        else if (section.toLowerCase().includes('duration:')) {
            const duration = section.split(':')[1] || '';
            return `<div class="mt-3">
                <strong class="text-teal-700">⏱️ Duration:</strong>
                <span class="ml-2">${duration}</span>
            </div>`;
        }
        return `<div class="mt-2">${section}</div>`;
    }).join('');
}

function displayRecommendations(recommendations) {
    const grid = document.getElementById('recommendationsGrid');
    if (!grid) {
        console.error('Recommendations grid element not found');
        return;
    }

    // Clear existing recommendations
    grid.innerHTML = '';

    // Create and append recommendation cards
    recommendations.forEach((rec, index) => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-md p-6 mb-6';
        card.innerHTML = `
            <div class="recommendation-content">
                <h3 class="text-xl font-bold mb-3 text-teal-700">${rec.name}</h3>
                <div class="text-gray-700">
                    ${rec.details}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Error handling function
function handleError(error, message = 'An error occurred') {
    console.error(error);
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    if (errorMessage && errorText) {
        errorText.textContent = `${message}: ${error.message}`;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    } else {
        alert(`${message}: ${error.message}`);
    }
}