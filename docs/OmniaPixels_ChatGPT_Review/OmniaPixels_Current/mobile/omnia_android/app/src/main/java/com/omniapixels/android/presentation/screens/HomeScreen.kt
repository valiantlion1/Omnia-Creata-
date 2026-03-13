package com.omniapixels.android.presentation.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.omniapixels.android.presentation.viewmodel.HomeViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToUpload: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Welcome Card
        WelcomeCard(onNavigateToUpload = { onNavigateToUpload("enhance") })
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Quick Actions
        QuickActionsSection(onNavigateToUpload = onNavigateToUpload)
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Featured Models
        if (uiState.models.isNotEmpty()) {
            FeaturedModelsSection(models = uiState.models)
        }
    }
}

@Composable
fun WelcomeCard(onNavigateToUpload: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primary
        )
    ) {
        Column(
            modifier = Modifier.padding(24.dp)
        ) {
            Text(
                text = "Welcome to OmniaPixels",
                style = MaterialTheme.typography.headlineMedium.copy(
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "AI-powered image processing at your fingertips",
                style = MaterialTheme.typography.bodyLarge.copy(
                    color = Color.White.copy(alpha = 0.9f)
                )
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Button(
                onClick = onNavigateToUpload,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Text("Start Processing")
            }
        }
    }
}

@Composable
fun QuickActionsSection(onNavigateToUpload: (String) -> Unit) {
    val actions = listOf(
        QuickAction("Remove Background", Icons.Default.AutoFixHigh, "background_removal", Color(0xFF2196F3)),
        QuickAction("Enhance Image", Icons.Default.Tune, "enhance", Color(0xFF4CAF50)),
        QuickAction("Super Resolution", Icons.Default.ZoomIn, "super_resolution", Color(0xFFFF9800)),
        QuickAction("Smart Crop", Icons.Default.Crop, "crop", Color(0xFF9C27B0))
    )

    Column {
        Text(
            text = "Quick Actions",
            style = MaterialTheme.typography.headlineSmall.copy(
                fontWeight = FontWeight.Bold
            )
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.height(200.dp)
        ) {
            items(actions) { action ->
                QuickActionCard(
                    action = action,
                    onClick = { onNavigateToUpload(action.type) }
                )
            }
        }
    }
}

@Composable
fun QuickActionCard(
    action: QuickAction,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.aspectRatio(1.2f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = action.icon,
                contentDescription = action.title,
                tint = action.color,
                modifier = Modifier.size(32.dp)
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = action.title,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.SemiBold
                ),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}

@Composable
fun FeaturedModelsSection(models: List<Any>) {
    Column {
        Text(
            text = "Featured Models",
            style = MaterialTheme.typography.headlineSmall.copy(
                fontWeight = FontWeight.Bold
            )
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        LazyColumn(
            modifier = Modifier.height(200.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(models.size) { index ->
                Card(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ListTile(
                        headlineContent = {
                            Text("Model ${index + 1}")
                        },
                        supportingContent = {
                            Text("AI processing model")
                        },
                        leadingContent = {
                            Icon(Icons.Default.Psychology)
                        }
                    )
                }
            }
        }
    }
}

data class QuickAction(
    val title: String,
    val icon: ImageVector,
    val type: String,
    val color: Color
)
