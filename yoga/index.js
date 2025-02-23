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
        const response = await fetch('https://r0c8kgwocscg8gsokogwwsw4.zetaverse.one/ai', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer A8DMqQzWsdh0ZNRwYwCdRGjHpWt1',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `As a yoga instructor, please analyze these health conditions and provide 3 specific yoga poses. For each pose, include: 1) The pose name 2) Key benefits 3) Detailed step-by-step instructions 4) Important precautions 5) Duration recommendation./n Health conditions: ${healthCondition}`
                        }
                    ]
                }]
            })
        });

        const data = await response.json();
        
        // Parse and display recommendations
        const recommendations = parseAIResponse(data.message);
        displayRecommendations(recommendations);

        // Show recommendations section
        document.getElementById('recommendations').classList.remove('hidden');
        
        // Reset button state
        button.disabled = false;
        buttonText.textContent = 'Get Personalized Yoga Plan';
        loadingSpinner.classList.add('hidden');
        
        // Smooth scroll to recommendations
        document.getElementById('recommendations').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
        button.disabled = false;
        buttonText.textContent = 'Get Personalized Yoga Plan';
        loadingSpinner.classList.add('hidden');
    }
}

function parseAIResponse(response) {
    const poses = response.split(/d+\./g).filter(pose => pose.trim());
    return poses.map(pose => {
        const lines = pose.split('\n').filter(line => line.trim());
        const poseName = lines[0].trim();
        return {
            name: poseName,
            details: formatYogaDetails(pose),
            image: `https://source.unsplash.com/400x300/?yoga,${encodeURIComponent(poseName)}`
        };
    });
}

function formatYogaDetails(poseText) {
    // Split the text into sections and format it with appropriate styling
    const sections = poseText.split('\n').filter(line => line.trim());
    return sections.map(section => {
        if (section.toLowerCase().includes('benefits:')) {
            return `<div class="mt-3"><strong class="text-teal-700">✨ Benefits:</strong>${section.split(':')[1]}</div>`;
        } else if (section.toLowerCase().includes('steps:') || section.toLowerCase().includes('instructions:')) {
            return `<div class="mt-3"><strong class="text-teal-700">📝 Steps:</strong>${section.split(':')[1]}</div>`;
        } else if (section.toLowerCase().includes('precautions:')) {
            return `<div class="mt-3"><strong class="text-teal-700">⚠️ Precautions:</strong>${section.split(':')[1]}</div>`;
        } else if (section.toLowerCase().includes('duration:')) {
            return `<div class="mt-3"><strong class="text-teal-700">⏱️ Duration:</strong>${section.split(':')[1]}</div>`;
        }
        return section;
    }).join('');
}

function displayRecommendations(recommendations) {
    const grid = document.getElementById('recommendationsGrid');
    grid.innerHTML = '';
    
    recommendations.forEach((rec, index) => {
        const card = document.createElement('div');
        //card.className = 'yoga-card rounded-lg shadow-lg overflow-hidden';
        card.innerHTML = `
            <div class="">
                ${rec.name}'/n'
                ${index + 1}
                ${rec.details}

            </div>
        `;
        grid.appendChild(card);
    });
}